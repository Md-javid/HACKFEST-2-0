"""
PolicyPulse — Risk Prediction Agent
Scans all company records against all rules and identifies records
that are AT RISK of generating violations — before they actually trigger.

Prediction Strategies:
  1. FIELD MISSING     — required field is absent from the record
  2. EXPIRY IMMINENT   — date-based field is within 30 days of failing
  3. VALUE DRIFT       — numeric field is outside acceptable range
  4. PATTERN MATCH     — similar records in the same dept already have violations

Output: A list of predicted risks per record, ranked by predicted severity.
"""

from datetime import datetime, timezone, timedelta
from typing import Any
from app.core.database import get_database


# Risk level → severity mapping
RISK_LEVELS = {
    5: "critical",
    4: "high",
    3: "medium",
    2: "low",
    1: "info",
}

# Days-until-expiry thresholds for "expiry imminent" warnings
EXPIRY_WARNING_DAYS = 30
EXPIRY_DANGER_DAYS = 7


def _severity_from_score(score: int) -> str:
    for threshold, sev in sorted(RISK_LEVELS.items(), reverse=True):
        if score >= threshold:
            return sev
    return "low"


def _days_until(value: Any) -> int | None:
    """Return days until a date value. Negative = already expired."""
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
        return (dt - datetime.now(timezone.utc)).days
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                dt = datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
                return (dt - datetime.now(timezone.utc)).days
            except ValueError:
                continue
    return None


# ─────────────────────────────────────────────────────────────
#  Core Prediction Logic
# ─────────────────────────────────────────────────────────────

def _predict_for_record(record: dict, rules: list, existing_violation_ids: set) -> list:
    """
    Evaluate a single record against all rules and return risk predictions.
    """
    predictions = []
    record_id = record.get("record_id", "")
    data = record.get("data", {})

    for rule in rules:
        val_logic = rule.get("validation_logic", {})
        field = val_logic.get("field", "")
        operator = val_logic.get("operator", "")
        threshold = val_logic.get("value")

        if not field or not operator:
            continue

        # Skip rules that already have open violations for this record
        combo_key = f"{record_id}:{rule.get('rule_id', '')}"
        if combo_key in existing_violation_ids:
            continue

        actual = data.get(field)
        risk_score = 0
        risk_reason = ""
        risk_type = ""

        # ── Strategy 1: Field Missing ──────────────────────────────
        if actual is None or actual == "" or actual == []:
            risk_score = 4
            risk_reason = (
                f"Required field '{field}' is missing from this record. "
                f"Rule '{rule.get('name', '')}' will flag this as a violation on the next scan."
            )
            risk_type = "field_missing"

        # ── Strategy 2: Boolean Should Be True But Is False ───────
        elif operator == "is_true" and actual is False:
            risk_score = 5
            risk_reason = (
                f"Field '{field}' is currently False. "
                f"Rule requires it to be True — this will become a violation."
            )
            risk_type = "boolean_violation"

        elif operator == "is_false" and actual is True:
            risk_score = 4
            risk_reason = (
                f"Field '{field}' is currently True but rule requires it to be False."
            )
            risk_type = "boolean_violation"

        # ── Strategy 3: Date Fields — Expiry Imminent ─────────────
        elif operator in ("date_within_days", "not_expired"):
            days_left = _days_until(actual)
            if days_left is not None:
                if days_left < 0:
                    risk_score = 5
                    risk_reason = (
                        f"Field '{field}' expired {abs(days_left)} days ago. "
                        "Violation is imminent if not already detected."
                    )
                    risk_type = "expired"
                elif days_left <= EXPIRY_DANGER_DAYS:
                    risk_score = 4
                    risk_reason = (
                        f"Field '{field}' expires in {days_left} days — within danger threshold ({EXPIRY_DANGER_DAYS}d). "
                        "Immediate action required."
                    )
                    risk_type = "expiry_imminent"
                elif days_left <= EXPIRY_WARNING_DAYS:
                    risk_score = 2
                    risk_reason = (
                        f"Field '{field}' expires in {days_left} days. "
                        f"Warning threshold is {EXPIRY_WARNING_DAYS} days."
                    )
                    risk_type = "expiry_warning"

        # ── Strategy 4: Numeric Threshold ─────────────────────────
        elif operator in ("less_than", "greater_than", "max_days") and isinstance(actual, (int, float)):
            if threshold is not None:
                if operator == "less_than" and actual >= threshold:
                    risk_score = 3
                    risk_reason = f"Field '{field}' = {actual} but rule requires < {threshold}."
                    risk_type = "threshold_breach"
                elif operator == "greater_than" and actual <= threshold:
                    risk_score = 3
                    risk_reason = f"Field '{field}' = {actual} but rule requires > {threshold}."
                    risk_type = "threshold_breach"
                elif operator == "max_days" and isinstance(threshold, (int, float)) and actual > threshold:
                    risk_score = 3
                    risk_reason = f"Field '{field}' = {actual} days exceeds maximum of {threshold} days."
                    risk_type = "retention_breach"

        # ── Strategy 5: Equals Check ──────────────────────────────
        elif operator == "equals" and threshold is not None:
            if str(actual).lower() != str(threshold).lower():
                risk_score = 2
                risk_reason = (
                    f"Field '{field}' = '{actual}' but rule expects '{threshold}'."
                )
                risk_type = "value_mismatch"

        # Only report if risk score is meaningful
        if risk_score >= 2:
            predictions.append({
                "record_id": record_id,
                "record_type": record.get("type", "unknown"),
                "department": record.get("department", ""),
                "rule_id": rule.get("rule_id", ""),
                "rule_name": rule.get("name", ""),
                "field": field,
                "current_value": str(actual) if actual is not None else "null",
                "risk_score": risk_score,
                "risk_type": risk_type,
                "predicted_severity": _severity_from_score(risk_score),
                "reason": risk_reason,
                "recommendation": rule.get("required_action") or f"Ensure '{field}' satisfies '{operator}' requirement.",
            })

    return predictions


# ─────────────────────────────────────────────────────────────
#  Pattern Analysis: same-department risk spreading
# ─────────────────────────────────────────────────────────────

def _add_pattern_risks(predictions: list, violations: list, records: list) -> list:
    """
    If a department has multiple violations of the same rule,
    flag other records in that department as at-risk (pattern spreading).
    """
    # Build: rule_id → set of departments with violations
    dept_violation_rules: dict = {}
    for v in violations:
        rid = v.get("rule_id", "")
        dept = v.get("department", "")
        if rid and dept:
            dept_violation_rules.setdefault(rid, set()).add(dept)

    # Build: already-predicted combos to avoid duplicates
    existing_combos = {(p["record_id"], p["rule_id"]) for p in predictions}

    # Build record lookup
    record_map = {r["record_id"]: r for r in records}

    new_predictions = []
    for record in records:
        dept = record.get("department", "")
        for rule_id, depts in dept_violation_rules.items():
            if dept in depts:
                combo = (record["record_id"], rule_id)
                if combo not in existing_combos:
                    new_predictions.append({
                        "record_id": record["record_id"],
                        "record_type": record.get("type", "unknown"),
                        "department": dept,
                        "rule_id": rule_id,
                        "rule_name": "",
                        "field": "",
                        "current_value": "unknown",
                        "risk_score": 1,
                        "risk_type": "pattern_spread",
                        "predicted_severity": "info",
                        "reason": (
                            f"Department '{dept}' has other records violating this rule. "
                            "This record may be at similar risk."
                        ),
                        "recommendation": "Review this record proactively for the same compliance issue.",
                    })
                    existing_combos.add(combo)

    return predictions + new_predictions


# ─────────────────────────────────────────────────────────────
#  Main Risk Prediction Runner
# ─────────────────────────────────────────────────────────────

async def run_risk_prediction(
    record_type: str | None = None,
    department: str | None = None,
    min_risk_score: int = 2,
) -> dict:
    """
    Scan all records against all rules and return predicted violations.
    Returns a structured risk report with counts, severity breakdown, and ranked predictions.
    """
    db = get_database()

    # Load all rules
    rules = await db.rules.find({"is_active": True}).to_list(500)
    for r in rules:
        r.pop("_id", None)

    if not rules:
        return {
            "status": "no_rules",
            "message": "No active rules found. Upload a compliance policy first.",
            "predictions": [],
            "summary": {},
        }

    # Load records (with optional filters)
    record_query: dict = {}
    if record_type:
        record_query["type"] = record_type
    if department:
        record_query["department"] = department

    records = await db.company_records.find(record_query).to_list(500)
    for r in records:
        r.pop("_id", None)

    if not records:
        return {
            "status": "no_records",
            "message": "No company records found. Import records first.",
            "predictions": [],
            "summary": {},
        }

    # Get existing open violations to avoid double-counting
    existing_violations = await db.violations.find(
        {"status": "open"}, {"rule_id": 1, "record_id": 1, "department": 1}
    ).to_list(1000)
    for v in existing_violations:
        v.pop("_id", None)

    existing_violation_ids = {
        f"{v.get('record_id', '')}:{v.get('rule_id', '')}"
        for v in existing_violations
    }

    # Run predictions
    all_predictions = []
    for record in records:
        preds = _predict_for_record(record, rules, existing_violation_ids)
        all_predictions.extend(preds)

    # Add pattern-based risks
    all_predictions = _add_pattern_risks(all_predictions, existing_violations, records)

    # Filter by minimum risk score
    all_predictions = [p for p in all_predictions if p["risk_score"] >= min_risk_score]

    # Sort: highest risk first
    all_predictions.sort(key=lambda x: x["risk_score"], reverse=True)

    # Build summary
    severity_counts: dict = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    type_counts: dict = {}
    dept_counts: dict = {}
    for pred in all_predictions:
        sev = pred.get("predicted_severity", "low")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        rt = pred.get("risk_type", "other")
        type_counts[rt] = type_counts.get(rt, 0) + 1
        dept = pred.get("department", "Unknown")
        dept_counts[dept] = dept_counts.get(dept, 0) + 1

    # Top risky departments
    top_departments = sorted(dept_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Overall risk level
    critical_count = severity_counts.get("critical", 0)
    high_count = severity_counts.get("high", 0)
    if critical_count > 0:
        overall_risk = "critical"
    elif high_count > 3:
        overall_risk = "high"
    elif high_count > 0:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "records_scanned": len(records),
        "rules_evaluated": len(rules),
        "total_predictions": len(all_predictions),
        "overall_risk_level": overall_risk,
        "summary": {
            "by_severity": severity_counts,
            "by_type": type_counts,
            "top_risk_departments": [
                {"department": d, "predictions": c} for d, c in top_departments
            ],
        },
        "predictions": all_predictions[:100],  # cap at 100 for API response
    }
