"""
PolicyPulse AI – Rule Engine Service
Applies compliance rules against company database records.
"""
import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import get_database


def evaluate_rule(rule: dict, record: dict) -> bool:
    """
    Evaluate if a record violates a rule based on validation_logic.
    Returns True if there IS a violation.
    """
    logic = rule.get("validation_logic", {})
    if not logic:
        return False

    field = logic.get("field", "")
    operator = logic.get("operator", "")
    expected = logic.get("value")

    data = record.get("data", {})
    actual = data.get(field)

    try:
        if operator == "equals":
            return str(actual) != str(expected)
        elif operator == "not_equals":
            return str(actual) == str(expected)
        elif operator == "is_true":
            return not bool(actual)
        elif operator == "is_false":
            return bool(actual)
        elif operator == "greater_than":
            return float(actual) <= float(expected)
        elif operator == "less_than":
            return float(actual) >= float(expected)
        elif operator == "contains":
            return str(expected).lower() not in str(actual).lower()
        elif operator == "exists":
            return actual is None or actual == ""
        elif operator == "date_within_days":
            date_val = datetime.strptime(str(actual), "%Y-%m-%d")
            cutoff = datetime.utcnow() - timedelta(days=int(expected))
            return date_val < cutoff
        else:
            return False
    except (ValueError, TypeError):
        return False


def rule_applies_to_record(rule: dict, record: dict) -> bool:
    """Check if a rule applies to a specific record type."""
    applicable = rule.get("applicable_record_types", ["all"])
    record_type = record.get("type", "")
    return "all" in applicable or record_type in applicable


async def run_compliance_scan() -> dict:
    """
    Run a full compliance scan across all company records and rules.
    Returns scan results with violations found.
    """
    db = get_database()
    if db is None:
        return {"error": "Database not connected"}

    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"
    started_at = datetime.now(timezone.utc).isoformat()

    await db.scan_history.insert_one({
        "scan_id": scan_id,
        "status": "running",
        "started_at": started_at,
        "violations_found": 0,
        "records_scanned": 0,
        "rules_applied": 0,
    })

    rules = await db.rules.find({}).to_list(length=1000)
    records = await db.company_records.find({}).to_list(length=5000)

    # Pre-fetch all existing open violations into memory — avoids N*M DB queries
    existing_open = await db.violations.find(
        {"status": {"$in": ["open", "needs_human_review"]}},
        {"rule_id": 1, "record_id": 1}
    ).to_list(length=None)
    open_pairs: set = {(v["rule_id"], v["record_id"]) for v in existing_open}

    violations_found = 0
    new_violations = []

    for record in records:
        record_id = record.get("record_id", str(record["_id"]))
        for rule in rules:
            rule_id = rule.get("rule_id")
            if not rule_applies_to_record(rule, record):
                continue
            if (rule_id, record_id) in open_pairs:
                continue
            if not evaluate_rule(rule, record):
                continue

            vio_id = f"VIO-{uuid.uuid4().hex[:8].upper()}"
            new_violations.append({
                "violation_id": vio_id,
                "scan_id": scan_id,
                "rule_id": rule_id,
                "record_id": record_id,
                "policy_id": rule.get("policy_id"),
                "condition": rule.get("condition", ""),
                "explanation": f"Record {record_id} violates rule: {rule.get('condition', '')}",
                "confidence_score": 0.85,
                "severity": rule.get("severity", "medium"),
                "suggested_remediation": rule.get("required_action", "Review and remediate"),
                "status": "open",
                "policy_reference": rule.get("policy_reference", ""),
                "department": record.get("department", ""),
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "reviewed": False,
                "needs_human_review": rule.get("severity") in ("critical", "high"),
            })
            violations_found += 1

    # Bulk insert all new violations in one DB round-trip
    if new_violations:
        await db.violations.insert_many(new_violations)

    completed_at = datetime.now(timezone.utc).isoformat()
    await db.scan_history.update_one(
        {"scan_id": scan_id},
        {"$set": {
            "status": "completed",
            "completed_at": completed_at,
            "violations_found": violations_found,
            "records_scanned": len(records),
            "rules_applied": len(rules),
        }},
    )

    return {
        "scan_id": scan_id,
        "violations_found": violations_found,
        "records_scanned": len(records),
        "rules_applied": len(rules),
        "completed_at": completed_at,
    }
