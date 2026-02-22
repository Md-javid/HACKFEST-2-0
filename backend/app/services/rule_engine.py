"""
PolicyPulse AI – Rule Engine Service
Applies compliance rules against company database records.
"""
import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import get_database


_RISK_BY_SEVERITY = {
    "critical": (
        "This is a critical security or compliance failure. "
        "Unresolved, it can lead to data breaches, regulatory sanctions, "
        "or significant financial penalties. Immediate remediation is required."
    ),
    "high": (
        "This represents a high-priority compliance gap that exposes the organization "
        "to regulatory penalties, security incidents, or audit findings. "
        "It should be resolved within the current sprint or release cycle."
    ),
    "medium": (
        "This is a moderate compliance issue that, while not immediately critical, "
        "increases overall risk exposure. Address it in the next planned review cycle."
    ),
    "low": (
        "This is a low-severity compliance observation. It has limited immediate impact "
        "but should be tracked and resolved before your next audit or certification renewal."
    ),
}


def _risk_assessment(severity: str) -> str:
    return _RISK_BY_SEVERITY.get(
        severity,
        "This compliance violation requires review and remediation."
    )


def _human_explanation(rule: dict, record: dict, record_id: str) -> str:
    """Generate a plain-English explanation of a compliance violation."""
    condition = rule.get("condition", "")
    logic = rule.get("validation_logic", {})
    field = logic.get("field", "")
    record_name = record.get("data", {}).get("name") or record.get("name") or record_id

    if field == "mfa_enabled":
        return (
            f"{record_name} does not have Multi-Factor Authentication (MFA) enabled. "
            "MFA adds a critical second layer of identity verification and is required for all accounts."
        )
    if field == "encryption_enabled":
        return (
            f"{record_name} is not encrypted at rest. "
            "Any sensitive data stored on this asset is at risk of exposure if the storage medium is compromised."
        )
    if field == "last_training_date":
        return (
            f"{record_name} has not completed the required annual security awareness training. "
            "Up-to-date training is mandatory to maintain a compliant security posture."
        )
    if field == "contract_signed":
        return (
            f"Vendor '{record_name}' does not have a signed Data Processing Agreement (DPA) on file. "
            "A DPA is legally required before sharing any personal data with third parties."
        )
    if field == "backup_enabled":
        return (
            f"{record_name} does not have automated backups enabled. "
            "Without regular backups, data loss from incidents cannot be recovered."
        )
    if field == "ssl_certificate_valid":
        return (
            f"{record_name} has an invalid or expired SSL/TLS certificate. "
            "All encrypted connections to this server may be compromised or blocked."
        )
    if field == "retention_days":
        return (
            f"{record_name} has been retaining data beyond the maximum allowed period. "
            "Excess data retention violates data minimisation requirements and increases breach exposure."
        )
    # Generic fallback
    return (
        f"Record '{record_name}' does not satisfy the compliance requirement: \"{condition}\". "
        "Review the record details and apply the suggested remediation."
    )


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
                "violated_rule": rule.get("condition", ""),
                "explanation": _human_explanation(rule, record, record_id),
                "risk_assessment": _risk_assessment(rule.get("severity", "medium")),
                "confidence_score": 0.85,
                "severity": rule.get("severity", "medium"),
                "suggested_remediation": rule.get("required_action", "Review and remediate"),
                "status": "open",
                "policy_reference": rule.get("policy_reference", ""),
                "department": record.get("department", ""),
                "detected_at": datetime.now(timezone.utc),  # stored as BSON datetime for range queries
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
