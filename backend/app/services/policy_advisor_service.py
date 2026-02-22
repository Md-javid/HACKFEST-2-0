"""
PolicyPulse — Policy Advisor Agent
Analyzes violation patterns and generates actionable policy recommendations.

Analysis Strategies:
  1. FREQUENCY ANALYSIS  — rules that repeatedly trigger violations
  2. REPEAT OFFENDERS    — records that violate rules again after resolution
  3. COVERAGE GAPS       — record types not covered by any active rule
  4. SEVERITY UPGRADES   — frequently triggered rules that should be promoted
  5. NEW RULE SUGGESTIONS — based on uncovered fields observed in record data
"""

from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter
from app.core.database import get_database
from app.services.agent_service import _log_agent_action


# ─────────────────────────────────────────────────────────────
#  Known "important" fields that should have rules
# ─────────────────────────────────────────────────────────────

COMMON_COMPLIANCE_FIELDS = {
    "mfa_enabled": {
        "suggested_rule": "All accounts must have MFA enabled",
        "operator": "is_true",
        "severity": "critical",
        "category": "Security",
    },
    "encryption_enabled": {
        "suggested_rule": "Data at rest must be encrypted",
        "operator": "is_true",
        "severity": "critical",
        "category": "Security",
    },
    "ssl_certificate_valid": {
        "suggested_rule": "All servers must have valid SSL/TLS certificates",
        "operator": "is_true",
        "severity": "high",
        "category": "Security",
    },
    "backup_enabled": {
        "suggested_rule": "Automated backups must be enabled",
        "operator": "is_true",
        "severity": "high",
        "category": "Operations",
    },
    "contract_signed": {
        "suggested_rule": "All vendors must have a signed contract on file",
        "operator": "is_true",
        "severity": "high",
        "category": "Vendor",
    },
    "last_training_date": {
        "suggested_rule": "Security training must be completed within the last 365 days",
        "operator": "date_within_days",
        "severity": "medium",
        "category": "Operations",
    },
    "firewall_enabled": {
        "suggested_rule": "All network devices must have firewall enabled",
        "operator": "is_true",
        "severity": "critical",
        "category": "Security",
    },
    "gdpr_compliant": {
        "suggested_rule": "All data processing must be GDPR compliant",
        "operator": "is_true",
        "severity": "critical",
        "category": "Privacy",
    },
    "data_classification": {
        "suggested_rule": "All records must have a data classification level assigned",
        "operator": "equals",
        "severity": "medium",
        "category": "Privacy",
    },
    "patch_level": {
        "suggested_rule": "Systems must be patched to the current level",
        "operator": "equals",
        "severity": "high",
        "category": "Security",
    },
    "retention_days": {
        "suggested_rule": "Data must not be retained beyond the maximum allowed period",
        "operator": "max_days",
        "severity": "medium",
        "category": "Privacy",
    },
    "incident_response_plan": {
        "suggested_rule": "Incident response plan must be documented and tested",
        "operator": "is_true",
        "severity": "high",
        "category": "Operations",
    },
}


# ─────────────────────────────────────────────────────────────
#  Analysis Functions
# ─────────────────────────────────────────────────────────────

async def _analyze_violation_frequency(db, days: int = 30) -> list:
    """
    Find rules with the most violations in the past N days.
    Suggest strengthening these rules or raising their severity.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    violations = await db.violations.find(
        {"detected_at": {"$gte": since}}, {"rule_id": 1, "severity": 1}
    ).to_list(2000)

    rule_counts = Counter(v["rule_id"] for v in violations if v.get("rule_id"))
    severity_map = defaultdict(list)
    for v in violations:
        if v.get("rule_id"):
            severity_map[v["rule_id"]].append(v.get("severity", "low"))

    recommendations = []
    for rule_id, count in rule_counts.most_common(10):
        rule = await db.rules.find_one({"rule_id": rule_id})
        if not rule:
            continue
        current_severity = rule.get("severity", "medium")
        severities = severity_map[rule_id]
        critical_pct = severities.count("critical") / len(severities) if severities else 0

        if count >= 5 and current_severity not in ("critical",):
            recommendations.append({
                "type": "severity_upgrade",
                "priority": "high",
                "rule_id": rule_id,
                "rule_name": rule.get("name", rule_id),
                "current_severity": current_severity,
                "suggested_severity": "critical" if critical_pct > 0.5 else "high",
                "violation_count": count,
                "analysis": (
                    f"Rule '{rule.get('name', rule_id)}' triggered {count} violations in {days} days. "
                    f"{critical_pct*100:.0f}% were tagged critical. "
                    "Consider raising the severity level to ensure faster remediation."
                ),
                "action": f"Upgrade rule severity from '{current_severity}' to "
                          f"'{'critical' if critical_pct > 0.5 else 'high'}'.",
            })
        elif count >= 3:
            recommendations.append({
                "type": "frequent_violation",
                "priority": "medium",
                "rule_id": rule_id,
                "rule_name": rule.get("name", rule_id),
                "violation_count": count,
                "analysis": (
                    f"Rule '{rule.get('name', rule_id)}' triggered {count} violations in {days} days. "
                    "This rule is triggering frequently. Consider targeted training or automated enforcement."
                ),
                "action": "Add automated enforcement or schedule a compliance training session for affected departments.",
            })

    return recommendations


async def _analyze_repeat_offenders(db) -> list:
    """
    Find records that have had the same rule violation multiple times.
    """
    resolved_violations = await db.violations.find(
        {"status": "resolved"}, {"record_id": 1, "rule_id": 1}
    ).to_list(2000)

    combo_counts = Counter(
        (v.get("record_id", ""), v.get("rule_id", ""))
        for v in resolved_violations
        if v.get("record_id") and v.get("rule_id")
    )

    # Also check currently open ones that were previously resolved
    open_violations = await db.violations.find(
        {"status": "open"}, {"record_id": 1, "rule_id": 1}
    ).to_list(1000)
    open_combos = {
        (v.get("record_id", ""), v.get("rule_id", ""))
        for v in open_violations
    }

    recommendations = []
    for (record_id, rule_id), count in combo_counts.most_common(10):
        if count < 2:
            continue
        is_currently_open = (record_id, rule_id) in open_combos

        rule = await db.rules.find_one({"rule_id": rule_id})
        rule_name = rule.get("name", rule_id) if rule else rule_id

        recommendations.append({
            "type": "repeat_offender",
            "priority": "high" if is_currently_open else "medium",
            "record_id": record_id,
            "rule_id": rule_id,
            "rule_name": rule_name,
            "repeat_count": count,
            "currently_open": is_currently_open,
            "analysis": (
                f"Record '{record_id}' has violated rule '{rule_name}' {count} times. "
                f"{'This violation is currently open again.' if is_currently_open else 'Was previously resolved.'} "
                "This pattern suggests the fix is not permanent."
            ),
            "action": (
                "Investigate root cause — the auto-fix may be reverted by another process. "
                "Consider enforcing this at the infrastructure level to prevent regression."
            ),
        })

    return recommendations


async def _analyze_coverage_gaps(db) -> list:
    """
    Check which record types / departments have no rules covering them.
    Also detect fields observed in records that have no corresponding rule.
    """
    # Get all record types + departments
    records = await db.company_records.find(
        {}, {"type": 1, "department": 1, "data": 1}
    ).to_list(500)

    # Collect record types and all observed fields
    all_record_types = set(r.get("type", "unknown") for r in records)
    observed_fields: Counter = Counter()
    for rec in records:
        for field in rec.get("data", {}).keys():
            observed_fields[field] += 1

    # Get all fields covered by rules
    rules = await db.rules.find({"is_active": True}, {"validation_logic": 1}).to_list(500)
    covered_fields = set()
    for rule in rules:
        field = rule.get("validation_logic", {}).get("field", "")
        if field:
            covered_fields.add(field)

    recommendations = []

    # Check observed fields NOT covered by any rule
    for field, count in observed_fields.most_common():
        if field in covered_fields:
            continue
        if field in COMMON_COMPLIANCE_FIELDS and count >= 2:
            template = COMMON_COMPLIANCE_FIELDS[field]
            recommendations.append({
                "type": "coverage_gap",
                "priority": "high" if template["severity"] in ("critical", "high") else "medium",
                "field": field,
                "observed_in_records": count,
                "suggested_rule": template["suggested_rule"],
                "operator": template["operator"],
                "severity": template["severity"],
                "category": template["category"],
                "analysis": (
                    f"Field '{field}' is present in {count} records but has no active compliance rule. "
                    f"This is a known compliance-critical field ({template['category']})."
                ),
                "action": (
                    f"Create a new '{template['severity']}' rule: \"{template['suggested_rule']}\". "
                    f"Use operator '{template['operator']}' on field '{field}'."
                ),
            })

    return recommendations


async def _generate_new_rule_suggestions(db) -> list:
    """
    Based on violation history and record structure,
    suggest entirely new rules that would improve compliance coverage.
    """
    # Rules currently existing
    existing_rules = await db.rules.find({}, {"validation_logic": 1, "name": 1}).to_list(500)
    existing_conditions = {
        r.get("validation_logic", {}).get("field", "") for r in existing_rules
    }

    suggestions = []
    for field, template in COMMON_COMPLIANCE_FIELDS.items():
        if field not in existing_conditions:
            suggestions.append({
                "type": "new_rule_suggestion",
                "priority": "high" if template["severity"] in ("critical", "high") else "medium",
                "suggested_name": template["suggested_rule"],
                "field": field,
                "operator": template["operator"],
                "severity": template["severity"],
                "category": template["category"],
                "analysis": (
                    f"No rule currently checks '{field}'. "
                    f"This is a standard {template['category']} compliance requirement."
                ),
                "action": (
                    f"Add rule: '{template['suggested_rule']}' "
                    f"checking {field} with operator '{template['operator']}'."
                ),
            })

    # Sort by severity
    priority_map = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda x: priority_map.get(x["priority"], 2))
    return suggestions[:8]  # cap at 8 suggestions


# ─────────────────────────────────────────────────────────────
#  Main Policy Advisor Runner
# ─────────────────────────────────────────────────────────────

async def run_policy_advisor() -> dict:
    """
    Run all analysis strategies and return a comprehensive policy advisory report.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    # Run all analyses in sequence
    frequency_recs = await _analyze_violation_frequency(db, days=30)
    repeat_recs = await _analyze_repeat_offenders(db)
    coverage_recs = await _analyze_coverage_gaps(db)
    new_rule_recs = await _generate_new_rule_suggestions(db)

    # Combine and prioritize all recommendations
    all_recommendations = (
        frequency_recs + repeat_recs + coverage_recs + new_rule_recs
    )

    # Sort: high > medium > low, then by type priority
    type_order = {
        "severity_upgrade": 0,
        "repeat_offender": 1,
        "coverage_gap": 2,
        "new_rule_suggestion": 3,
        "frequent_violation": 4,
    }
    priority_order = {"high": 0, "medium": 1, "low": 2}
    all_recommendations.sort(key=lambda x: (
        priority_order.get(x.get("priority", "low"), 2),
        type_order.get(x.get("type", ""), 5),
    ))

    # Summary counts
    type_counts: dict = {}
    priority_counts: dict = {"high": 0, "medium": 0, "low": 0}
    for rec in all_recommendations:
        t = rec.get("type", "other")
        type_counts[t] = type_counts.get(t, 0) + 1
        p = rec.get("priority", "low")
        priority_counts[p] = priority_counts.get(p, 0) + 1

    # Log the advisor run
    await _log_agent_action(
        "system",
        "policy_advisor",
        f"Policy Advisor generated {len(all_recommendations)} recommendations "
        f"({priority_counts.get('high', 0)} high priority).",
    )

    # Overall health assessment
    high_count = priority_counts.get("high", 0)
    if high_count >= 5:
        health = "critical"
        health_msg = "Policy framework has critical gaps requiring immediate attention."
    elif high_count >= 3:
        health = "warning"
        health_msg = "Several high-priority policy improvements identified."
    elif high_count >= 1:
        health = "fair"
        health_msg = "Minor policy improvements recommended."
    else:
        health = "good"
        health_msg = "Policy framework is well-structured. Minor optimizations available."

    return {
        "status": "success",
        "timestamp": now.isoformat(),
        "policy_health": health,
        "policy_health_message": health_msg,
        "total_recommendations": len(all_recommendations),
        "summary": {
            "by_type": type_counts,
            "by_priority": priority_counts,
        },
        "recommendations": all_recommendations,
    }
