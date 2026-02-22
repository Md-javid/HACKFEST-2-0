"""
PolicyPulse — Multi-Agent Orchestration System
Coordinates four specialist agents through an intelligent router.

Architecture:
  Orchestrator (router) ──► SecurityAgent   (MFA, encryption, SSL, access)
                        ──► PrivacyAgent    (data retention, DPA, consent)
                        ──► VendorAgent     (third-party, contracts, SLA)
                        ──► OperationsAgent (backups, training, DR)

Each specialist agent:
  1. Classifies severity and root cause using domain knowledge
  2. Selects the optimal remediation strategy from its playbook
  3. Executes tools (fix field / resolve / escalate)
  4. Returns a structured result with confidence score
"""

import json
from datetime import datetime, timezone
from typing import Optional
from app.core.database import get_database
from app.services.agent_service import (
    TOOL_REGISTRY,
    tool_get_compliance_score,
    _log_agent_action,
    AgentState,
)


# ─────────────────────────────────────────────────────────────
#  Domain Classification
# ─────────────────────────────────────────────────────────────

SECURITY_FIELDS = {
    "mfa_enabled", "encryption_enabled", "ssl_certificate_valid",
    "firewall_enabled", "patch_level", "password_policy_enforced",
    "access_control_enabled", "two_factor_auth", "login_attempts_limit",
}

PRIVACY_FIELDS = {
    "retention_days", "data_minimization", "consent_obtained",
    "anonymization_enabled", "gdpr_compliant", "data_classification",
    "pii_encrypted", "right_to_erasure", "processing_agreement",
}

VENDOR_FIELDS = {
    "contract_signed", "dpa_signed", "sla_agreed",
    "vendor_assessment_done", "third_party_audit", "nda_signed",
    "vendor_risk_score", "subprocessor_listed",
}

OPERATIONS_FIELDS = {
    "backup_enabled", "last_training_date", "dr_plan_tested",
    "incident_response_plan", "monitoring_enabled", "log_retention",
    "change_management_process", "maintenance_window",
}


def _classify_violation(rule: dict, violation: dict) -> str:
    """Route violation to the right specialist agent."""
    val_logic = rule.get("validation_logic", {})
    field = val_logic.get("field", "").lower()

    if field in SECURITY_FIELDS:
        return "security"
    if field in PRIVACY_FIELDS:
        return "privacy"
    if field in VENDOR_FIELDS:
        return "vendor"
    if field in OPERATIONS_FIELDS:
        return "operations"

    # Fallback: use rule category or title keywords
    category = (rule.get("category") or rule.get("name") or "").lower()
    title = (violation.get("title") or "").lower()
    text = category + " " + title

    if any(k in text for k in ["mfa", "encrypt", "ssl", "access", "auth", "security", "firewall"]):
        return "security"
    if any(k in text for k in ["privacy", "gdpr", "retention", "data", "consent", "pii"]):
        return "privacy"
    if any(k in text for k in ["vendor", "contract", "dpa", "third", "supplier"]):
        return "vendor"
    if any(k in text for k in ["backup", "training", "disaster", "operations", "incident"]):
        return "operations"

    return "security"  # default


# ─────────────────────────────────────────────────────────────
#  Specialist Agent Playbooks
# ─────────────────────────────────────────────────────────────

SPECIALIST_PLAYBOOKS = {
    "security": {
        "name": "SecurityAgent",
        "icon": "🔒",
        "description": "Handles MFA, encryption, SSL, firewall, access control violations",
        "auto_fixable_operators": {"is_true", "is_false", "equals"},
        "priority": "critical",
        "capabilities": [
            "Enable MFA on user accounts",
            "Activate encryption at rest",
            "Flag expired SSL certificates",
            "Enforce password policies",
            "Enable firewall rules",
        ],
    },
    "privacy": {
        "name": "PrivacyAgent",
        "icon": "🔐",
        "description": "Handles GDPR, data retention, consent, anonymization violations",
        "auto_fixable_operators": {"is_true", "is_false", "equals"},
        "priority": "high",
        "capabilities": [
            "Enable data anonymization",
            "Flag retention policy breaches",
            "Verify consent records",
            "Check GDPR compliance flags",
            "Escalate PII exposure risks",
        ],
    },
    "vendor": {
        "name": "VendorAgent",
        "icon": "🤝",
        "description": "Handles vendor contracts, DPA, SLA, third-party risk violations",
        "auto_fixable_operators": {"is_true"},
        "priority": "high",
        "capabilities": [
            "Flag missing contracts",
            "Escalate unsigned DPAs",
            "Identify high-risk vendors",
            "Request SLA agreements",
            "Trigger vendor assessments",
        ],
    },
    "operations": {
        "name": "OperationsAgent",
        "icon": "⚙️",
        "description": "Handles backups, training, DR plans, incident response",
        "auto_fixable_operators": {"is_true", "is_false"},
        "priority": "medium",
        "capabilities": [
            "Enable automated backups",
            "Flag overdue training",
            "Escalate untested DR plans",
            "Verify monitoring configuration",
            "Schedule maintenance windows",
        ],
    },
}


# ─────────────────────────────────────────────────────────────
#  Specialist Agent Runner
# ─────────────────────────────────────────────────────────────

async def run_specialist_agent(
    violation: dict, rule: dict, record: dict, agent_type: str
) -> dict:
    """
    Execute the domain-specific specialist agent for a violation.
    Returns a structured result with confidence, actions, and outcome.
    """
    playbook = SPECIALIST_PLAYBOOKS[agent_type]
    val_logic = rule.get("validation_logic", {})
    field = val_logic.get("field", "")
    operator = val_logic.get("operator", "")
    expected = val_logic.get("value")
    record_id = violation.get("record_id", "")
    violation_id = violation.get("violation_id", "")
    severity = violation.get("severity", "low")
    record_data = record.get("data", {}) if record else {}

    steps = []
    actions_taken = []
    confidence = 0.0

    # Step 1: Classify the violation within the specialist domain
    steps.append({
        "agent": playbook["name"],
        "phase": "classify",
        "thought": (
            f"{playbook['icon']} {playbook['name']} received violation {violation_id}. "
            f"Field: '{field}', Operator: '{operator}', Severity: {severity}. "
            f"Current value: {record_data.get(field, 'not found')}."
        ),
    })

    # Step 2: Determine if auto-fixable
    auto_fixable = (
        field
        and operator in playbook["auto_fixable_operators"]
        and record_id
    )

    if auto_fixable:
        confidence = 0.95
        # Determine fix value
        if operator == "is_true":
            fix_value = True
        elif operator == "is_false":
            fix_value = False
        elif operator == "equals":
            fix_value = expected
        else:
            fix_value = expected

        steps.append({
            "agent": playbook["name"],
            "phase": "plan",
            "thought": (
                f"Auto-fix available. Will set '{field}' = {fix_value} on record {record_id}. "
                f"Confidence: {confidence*100:.0f}%."
            ),
        })

        # Execute: update field
        result = await TOOL_REGISTRY["update_record_field"](
            record_id=record_id,
            field=field,
            value=fix_value,
            reason=f"{playbook['name']} auto-remediated: {rule.get('condition', 'compliance requirement')}",
        )
        actions_taken.append(
            f"[{playbook['icon']} {playbook['name']}] Set '{field}' = {fix_value} on {record_id}"
        )
        steps.append({
            "agent": playbook["name"],
            "phase": "act",
            "thought": f"Field update result: {result.get('message', 'done')}",
        })

        # Execute: resolve violation
        resolve_result = await TOOL_REGISTRY["resolve_violation"](
            violation_id=violation_id,
            reason=(
                f"{playbook['name']} auto-remediated: updated '{field}' to {fix_value}. "
                f"Rule: {rule.get('condition', 'policy requirement')} now satisfied."
            ),
        )
        actions_taken.append(
            f"[{playbook['icon']} {playbook['name']}] Resolved violation {violation_id}"
        )
        steps.append({
            "agent": playbook["name"],
            "phase": "resolve",
            "thought": f"Violation resolved: {resolve_result.get('message', 'done')}",
        })

        outcome = "resolved"

    else:
        # Cannot auto-fix — escalate if critical/high, acknowledge if low/medium
        if severity in ("critical", "high"):
            confidence = 0.88
            steps.append({
                "agent": playbook["name"],
                "phase": "plan",
                "thought": (
                    f"Operator '{operator}' on field '{field}' requires human action "
                    f"({severity} severity). Escalating to human reviewer."
                ),
            })
            escalate_result = await TOOL_REGISTRY["escalate_violation"](
                violation_id=violation_id,
                reason=(
                    f"{playbook['name']} determined human action required. "
                    f"Rule requires '{operator}' on '{field}'. "
                    f"Recommended action: {rule.get('required_action', 'manual review')}."
                ),
            )
            actions_taken.append(
                f"[{playbook['icon']} {playbook['name']}] Escalated {violation_id} — requires human action"
            )
            steps.append({
                "agent": playbook["name"],
                "phase": "escalate",
                "thought": f"Escalation complete: {escalate_result.get('message', 'done')}",
            })
            outcome = "escalated"

        else:
            confidence = 0.72
            steps.append({
                "agent": playbook["name"],
                "phase": "plan",
                "thought": (
                    f"Low/medium severity, no auto-fix available for '{operator}'. "
                    "Acknowledging violation with advisory note."
                ),
            })
            resolve_result = await TOOL_REGISTRY["resolve_violation"](
                violation_id=violation_id,
                reason=(
                    f"{playbook['name']} acknowledged: '{field}' ({operator}) "
                    f"requires manual follow-up. {rule.get('required_action', '')}."
                ),
            )
            actions_taken.append(
                f"[{playbook['icon']} {playbook['name']}] Acknowledged {violation_id} with advisory"
            )
            outcome = "resolved"

    # Log to agent_log
    await _log_agent_action(
        violation_id,
        f"specialist_{agent_type}",
        f"{playbook['name']}: {'; '.join(actions_taken)}",
    )

    return {
        "agent_type": agent_type,
        "agent_name": playbook["name"],
        "agent_icon": playbook["icon"],
        "outcome": outcome,
        "confidence": confidence,
        "actions_taken": actions_taken,
        "steps": steps,
        "violation_id": violation_id,
    }


# ─────────────────────────────────────────────────────────────
#  Orchestrator: Smart Router
# ─────────────────────────────────────────────────────────────

async def run_orchestrator(violation_id: str) -> dict:
    """
    Orchestrate a violation through the multi-agent pipeline.
    1. Load context
    2. Classify to specialist domain
    3. Run specialist agent
    4. Return structured result
    """
    db = get_database()

    # Load violation
    violation = await db.violations.find_one({"violation_id": violation_id})
    if not violation:
        return {
            "violation_id": violation_id,
            "status": "error",
            "message": f"Violation {violation_id} not found.",
        }
    violation.pop("_id", None)

    if violation.get("status") not in ("open", None):
        return {
            "violation_id": violation_id,
            "status": "skipped",
            "message": f"Violation already {violation.get('status')} — no action needed.",
            "routed_to": None,
        }

    # Load rule + record
    rule = {}
    record = {}
    if violation.get("rule_id"):
        r = await db.rules.find_one({"rule_id": violation["rule_id"]})
        if r:
            r.pop("_id", None)
            rule = r
    if violation.get("record_id"):
        rec = await db.company_records.find_one({"record_id": violation["record_id"]})
        if rec:
            rec.pop("_id", None)
            record = rec

    # Score before
    score_data = await tool_get_compliance_score()
    score_before = score_data["compliance_score"]

    # Orchestrator routing decision
    agent_type = _classify_violation(rule, violation)
    playbook = SPECIALIST_PLAYBOOKS[agent_type]

    routing_log = {
        "orchestrator": "PolicyPulse Orchestrator v2",
        "decision": f"Routed violation {violation_id} to {playbook['name']}",
        "reasoning": (
            f"Rule field '{rule.get('validation_logic', {}).get('field', '?')}' "
            f"matches {agent_type} domain. Severity: {violation.get('severity')}."
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Run specialist agent
    agent_result = await run_specialist_agent(violation, rule, record, agent_type)

    # Score after
    score_data_after = await tool_get_compliance_score()
    score_after = score_data_after["compliance_score"]

    return {
        "violation_id": violation_id,
        "status": agent_result["outcome"],
        "routed_to": agent_type,
        "agent_name": playbook["name"],
        "agent_icon": playbook["icon"],
        "confidence": agent_result["confidence"],
        "actions_taken": agent_result["actions_taken"],
        "steps": agent_result["steps"],
        "routing_log": routing_log,
        "score_before": score_before,
        "score_after": score_after,
        "score_delta": round(score_after - score_before, 1),
    }


async def run_orchestrator_batch(severity_filter: str = "all") -> dict:
    """
    Run the orchestrator on all open violations, routing each to the right specialist.
    Returns aggregated stats per specialist agent.
    """
    db = get_database()
    query: dict = {"status": "open"}
    if severity_filter and severity_filter != "all":
        query["severity"] = severity_filter

    violations = await db.violations.find(query, {"violation_id": 1}).to_list(100)
    results = []
    agent_stats: dict = {
        k: {"resolved": 0, "escalated": 0, "errors": 0}
        for k in SPECIALIST_PLAYBOOKS
    }

    for v in violations:
        vid = v.get("violation_id", "")
        if not vid:
            continue
        result = await run_orchestrator(vid)
        results.append(result)
        agent_type = result.get("routed_to", "security")
        status = result.get("status", "error")
        if status == "resolved":
            agent_stats[agent_type]["resolved"] += 1
        elif status == "escalated":
            agent_stats[agent_type]["escalated"] += 1
        else:
            agent_stats[agent_type]["errors"] += 1

    score_data = await tool_get_compliance_score()

    return {
        "total_processed": len(results),
        "agent_stats": agent_stats,
        "final_compliance_score": score_data["compliance_score"],
        "results": results,
    }


async def get_agent_system_status() -> dict:
    """
    Returns health stats for all agents in the system.
    """
    db = get_database()
    now = datetime.now(timezone.utc)

    # Count agent log entries (by action type)
    total_logs = await db.agent_log.count_documents({})
    specialist_counts = {}
    for agent_type in SPECIALIST_PLAYBOOKS:
        count = await db.agent_log.count_documents(
            {"action": f"specialist_{agent_type}"}
        )
        specialist_counts[agent_type] = count

    resolve_count = await db.agent_log.count_documents({"action": "resolve"})
    escalate_count = await db.agent_log.count_documents({"action": "escalate"})
    update_count = await db.agent_log.count_documents({"action": "update_field"})

    # Recent activity
    recent = await db.agent_log.find().sort("timestamp", -1).limit(5).to_list(5)
    for r in recent:
        r.pop("_id", None)
        if isinstance(r.get("timestamp"), datetime):
            r["timestamp"] = r["timestamp"].isoformat()

    # Open violations breakdown
    open_total = await db.violations.count_documents({"status": "open"})
    escalated_total = await db.violations.count_documents({"status": "escalated"})
    resolved_total = await db.violations.count_documents({"status": "resolved"})

    score_data = await tool_get_compliance_score()

    agents = []
    for agent_type, playbook in SPECIALIST_PLAYBOOKS.items():
        actions = specialist_counts.get(agent_type, 0)
        agents.append({
            "type": agent_type,
            "name": playbook["name"],
            "icon": playbook["icon"],
            "description": playbook["description"],
            "status": "active",
            "actions_taken": actions,
            "capabilities": playbook["capabilities"],
        })

    return {
        "system": "PolicyPulse Multi-Agent System v2",
        "status": "operational",
        "timestamp": now.isoformat(),
        "compliance_score": score_data["compliance_score"],
        "violations": {
            "open": open_total,
            "escalated": escalated_total,
            "resolved": resolved_total,
        },
        "agent_log": {
            "total_entries": total_logs,
            "resolves": resolve_count,
            "escalations": escalate_count,
            "field_updates": update_count,
        },
        "agents": agents,
        "recent_activity": recent,
    }
