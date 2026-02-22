"""
PolicyPulse — Agentic AI Compliance Remediation Engine
Custom ReAct (Reason + Act) state machine — LangGraph-style architecture.

Graph:
  START → [perceive] → [reason] → [act] → [reflect] → END
                            ↑_____________|   (loops up to MAX_STEPS)

Agent Tools:
  get_violation_details   — fetch full violation data
  get_record_data         — fetch the record that triggered the violation
  get_rule_details        — fetch the compliance rule
  resolve_violation       — mark violation resolved, write AI reason
  update_record_field     — fix the data field that caused the violation
  escalate_violation      — flag for mandatory human review
  get_compliance_score    — compute live compliance %
"""

import json
import asyncio
from datetime import datetime, timezone
from typing import TypedDict, List, Optional, Any, Dict
from bson import ObjectId

from app.core.database import get_database
from app.core.config import settings

MAX_STEPS = 5  # max ReAct loop iterations per agent run


# ─────────────────────────────────────────────────────────────
#  Agent State (passed between all nodes)
# ─────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    violation_id: str
    violation: Optional[dict]
    rule: Optional[dict]
    record: Optional[dict]
    score_before: float
    score_after: float
    steps: List[dict]           # ReAct trace: [{thought, action, observation}]
    actions_taken: List[str]    # human-readable log
    final_answer: str
    status: str                 # "running" | "success" | "escalated" | "error"
    iteration: int


def _init_state(violation_id: str) -> AgentState:
    return AgentState(
        violation_id=violation_id,
        violation=None,
        rule=None,
        record=None,
        score_before=0.0,
        score_after=0.0,
        steps=[],
        actions_taken=[],
        final_answer="",
        status="running",
        iteration=0,
    )


# ─────────────────────────────────────────────────────────────
#  Tools (callable async functions the agent can invoke)
# ─────────────────────────────────────────────────────────────

async def tool_get_violation_details(violation_id: str) -> dict:
    db = get_database()
    v = await db.violations.find_one({"violation_id": violation_id})
    if v:
        v.pop("_id", None)
    return v or {"error": f"Violation {violation_id} not found"}


async def tool_get_record_data(record_id: str) -> dict:
    db = get_database()
    r = await db.company_records.find_one({"record_id": record_id})
    if r:
        r.pop("_id", None)
    return r or {"error": f"Record {record_id} not found"}


async def tool_get_rule_details(rule_id: str) -> dict:
    db = get_database()
    r = await db.rules.find_one({"rule_id": rule_id})
    if r:
        r.pop("_id", None)
    return r or {"error": f"Rule {rule_id} not found"}


async def tool_get_compliance_score() -> dict:
    db = get_database()
    total_rules = await db.rules.count_documents({})
    total_records = await db.company_records.count_documents({})
    open_v = await db.violations.count_documents({"status": "open"})
    critical = await db.violations.count_documents({"severity": "critical", "status": "open"})
    high = await db.violations.count_documents({"severity": "high", "status": "open"})
    medium = await db.violations.count_documents({"severity": "medium", "status": "open"})
    low = await db.violations.count_documents({"severity": "low", "status": "open"})

    if total_rules > 0 and total_records > 0:
        max_possible = total_records * total_rules
        weighted = critical * 4 + high * 3 + medium * 2 + low * 1
        score = max(0, 100 - (weighted / max_possible * 100 * 5))
        score = round(min(score, 100), 1)
    else:
        score = 100.0

    return {
        "compliance_score": score,
        "open_violations": open_v,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
    }


async def tool_resolve_violation(violation_id: str, reason: str) -> dict:
    db = get_database()
    result = await db.violations.update_one(
        {"violation_id": violation_id},
        {"$set": {
            "status": "resolved",
            "resolved_by": "PolicyPulse Agent",
            "resolution_reason": reason,
            "resolved_at": datetime.now(timezone.utc),
        }},
    )
    if result.modified_count > 0:
        await _log_agent_action(violation_id, "resolve", reason)
        return {"success": True, "message": f"Violation {violation_id} resolved by agent."}
    return {"success": False, "message": "Violation not found or already resolved."}


async def tool_update_record_field(record_id: str, field: str, value: Any, reason: str) -> dict:
    """Fix the actual data field that caused the compliance violation."""
    db = get_database()
    result = await db.company_records.update_one(
        {"record_id": record_id},
        {"$set": {
            f"data.{field}": value,
            "last_updated_by": "PolicyPulse Agent",
            "last_updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.modified_count > 0:
        await _log_agent_action(record_id, "update_field", f"Set {field}={value}. {reason}")
        return {"success": True, "message": f"Field '{field}' updated to {value} on record {record_id}."}
    return {"success": False, "message": f"Record {record_id} not found."}


async def tool_escalate_violation(violation_id: str, reason: str) -> dict:
    db = get_database()
    result = await db.violations.update_one(
        {"violation_id": violation_id},
        {"$set": {
            "status": "escalated",
            "escalation_reason": reason,
            "escalated_by": "PolicyPulse Agent",
            "escalated_at": datetime.now(timezone.utc),
            "needs_human_review": True,
        }},
    )
    if result.modified_count > 0:
        await _log_agent_action(violation_id, "escalate", reason)
        return {"success": True, "message": f"Violation {violation_id} escalated for human review."}
    return {"success": False, "message": "Violation not found."}


async def _log_agent_action(entity_id: str, action: str, reason: str):
    db = get_database()
    await db.agent_log.insert_one({
        "entity_id": entity_id,
        "action": action,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc),
        "agent": "PolicyPulse ReAct Agent v1",
    })


# Registry so the agent can call tools by name
TOOL_REGISTRY: Dict[str, Any] = {
    "get_violation_details": tool_get_violation_details,
    "get_record_data": tool_get_record_data,
    "get_rule_details": tool_get_rule_details,
    "get_compliance_score": tool_get_compliance_score,
    "resolve_violation": tool_resolve_violation,
    "update_record_field": tool_update_record_field,
    "escalate_violation": tool_escalate_violation,
}

TOOL_DESCRIPTIONS = """
Available tools (call with JSON args):
- get_violation_details(violation_id: str) → full violation object
- get_record_data(record_id: str) → the record that violated the rule
- get_rule_details(rule_id: str) → the compliance rule definition
- get_compliance_score() → current score + open violation counts
- resolve_violation(violation_id: str, reason: str) → mark resolved
- update_record_field(record_id: str, field: str, value: any, reason: str) → fix a data field
- escalate_violation(violation_id: str, reason: str) → flag for human review
"""


# ─────────────────────────────────────────────────────────────
#  Node: Perceive — load initial context from DB
# ─────────────────────────────────────────────────────────────

async def node_perceive(state: AgentState) -> AgentState:
    vid = state["violation_id"]
    violation = await tool_get_violation_details(vid)
    state["violation"] = violation

    if "error" not in violation:
        record_id = violation.get("record_id", "")
        rule_id = violation.get("rule_id", "")
        if record_id:
            state["record"] = await tool_get_record_data(record_id)
        if rule_id:
            state["rule"] = await tool_get_rule_details(rule_id)

    score_data = await tool_get_compliance_score()
    state["score_before"] = score_data["compliance_score"]

    state["steps"].append({
        "node": "perceive",
        "observation": f"Loaded violation {vid}. "
                       f"Score before: {state['score_before']}%. "
                       f"Record: {violation.get('record_id')}. "
                       f"Rule: {violation.get('rule_id')}. "
                       f"Severity: {violation.get('severity')}. "
                       f"Status: {violation.get('status')}.",
    })
    return state


# ─────────────────────────────────────────────────────────────
#  Node: Reason — Gemini picks action (ReAct loop)
# ─────────────────────────────────────────────────────────────

def _build_react_prompt(state: AgentState) -> str:
    history = "\n".join([
        f"Step {i+1}: {s.get('thought','')}\n→ Action: {s.get('action','')}\n→ Observation: {s.get('observation','')}"
        for i, s in enumerate(state["steps"]) if "action" in s
    ]) or "No steps taken yet."

    return f"""You are PolicyPulse Autonomous Compliance Agent. Your job is to remediate a compliance violation.

VIOLATION:
{json.dumps(state.get("violation", {}), indent=2, default=str)}

COMPLIANCE RULE:
{json.dumps(state.get("rule", {}), indent=2, default=str)}

RECORD DATA:
{json.dumps(state.get("record", {}), indent=2, default=str)}

PREVIOUS STEPS:
{history}

{TOOL_DESCRIPTIONS}

INSTRUCTIONS:
1. Analyze the violation carefully.
2. Decide the BEST action: auto-fix the data field (update_record_field) OR resolve directly OR escalate if human must act.
3. If the rule has a validation_logic field (e.g. field: "mfa_enabled", operator: "is_true"), you can fix it directly.
4. After acting, resolve the violation with a clear reason.
5. Only escalate if the fix requires physical action (e.g. hardware, contract signing).

Respond in this EXACT JSON format:
{{
  "thought": "My reasoning about what to do...",
  "action": "tool_name",
  "args": {{...tool arguments...}},
  "is_final": false
}}

If done (all actions taken), set "is_final": true and "action": "done":
{{
  "thought": "I have resolved/escalated the violation. Summary of what I did.",
  "action": "done",
  "args": {{}},
  "is_final": true
}}

Return ONLY the JSON object. No markdown, no explanation outside the JSON.
"""


async def node_reason(state: AgentState) -> AgentState:
    """LLM decides what tool to call next. Falls back to deterministic logic on quota error."""
    if state["status"] != "running":
        return state

    prompt = _build_react_prompt(state)

    try:
        from google import genai
        from google.genai import types as genai_types
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
            config=genai_types.GenerateContentConfig(temperature=0.2),
        )
        raw = response.text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        decision = json.loads(raw)

    except Exception as e:
        err = str(e)
        # On quota error or any failure, use deterministic fallback
        if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower() or True:
            decision = _deterministic_reason(state)

    state["steps"].append({
        "node": "reason",
        "thought": decision.get("thought", ""),
        "action": decision.get("action", "done"),
        "args": decision.get("args", {}),
    })
    state["_next_action"] = decision.get("action", "done")
    state["_next_args"] = decision.get("args", {})
    state["_is_final"] = decision.get("is_final", False)
    return state


def _deterministic_reason(state: AgentState) -> dict:
    """
    Rule-based fallback when Gemini is unavailable.
    Reads validation_logic from the rule and decides what to fix.
    """
    violation = state.get("violation") or {}
    rule = state.get("rule") or {}
    record = state.get("record") or {}
    steps = state.get("steps", [])

    # Already acted — wrap up
    last_actions = [s.get("action") for s in steps if "action" in s]
    if "resolve_violation" in last_actions or "escalate_violation" in last_actions:
        return {
            "thought": "I have already acted on this violation. Completing the agent run.",
            "action": "done",
            "args": {},
            "is_final": True,
        }

    vid = violation.get("violation_id", "")
    record_id = violation.get("record_id", "")
    severity = violation.get("severity", "low")
    val_logic = rule.get("validation_logic", {})
    field = val_logic.get("field", "")
    operator = val_logic.get("operator", "")
    expected = val_logic.get("value")
    record_data = record.get("data", {})

    AUTO_FIXABLE_OPERATORS = {"is_true", "is_false", "equals", "not_equals"}

    # Attempt to auto-fix data field
    if field and operator in AUTO_FIXABLE_OPERATORS and "update_record_field" not in last_actions:
        if operator == "is_true":
            fix_value = True
        elif operator == "is_false":
            fix_value = False
        elif operator in ("equals", "not_equals"):
            fix_value = expected
        else:
            fix_value = expected

        return {
            "thought": (
                f"Rule requires '{field}' to satisfy '{operator}'. "
                f"Current value: {record_data.get(field, 'missing')}. "
                f"I will update the field to {fix_value} to bring the record into compliance."
            ),
            "action": "update_record_field",
            "args": {
                "record_id": record_id,
                "field": field,
                "value": fix_value,
                "reason": f"Auto-remediated by PolicyPulse Agent: {rule.get('condition', 'compliance requirement')}",
            },
            "is_final": False,
        }

    # If field was just updated, now resolve
    if "update_record_field" in last_actions and "resolve_violation" not in last_actions:
        return {
            "thought": "The data field has been corrected. Now resolving the violation.",
            "action": "resolve_violation",
            "args": {
                "violation_id": vid,
                "reason": (
                    f"PolicyPulse Agent automatically updated field '{field}' "
                    f"to comply with: {rule.get('condition', 'policy requirement')}."
                ),
            },
            "is_final": False,
        }

    # Non-auto-fixable (e.g. date_within_days, training, physical) — escalate
    if severity in ("critical", "high"):
        return {
            "thought": (
                f"This {severity} violation requires human action (operator: {operator}). "
                "Cannot auto-fix — escalating for immediate human review."
            ),
            "action": "escalate_violation",
            "args": {
                "violation_id": vid,
                "reason": (
                    f"Auto-remediation not possible: rule requires '{operator}' on '{field}'. "
                    f"Human must take action: {rule.get('required_action', 'review and fix manually')}."
                ),
            },
            "is_final": False,
        }

    # Low/medium without fixable field — just resolve
    return {
        "thought": "No automatic fix available but severity is low/medium. Resolving with note.",
        "action": "resolve_violation",
        "args": {
            "violation_id": vid,
            "reason": f"Acknowledged by PolicyPulse Agent. Manual review recommended: {rule.get('required_action', '')}",
        },
        "is_final": False,
    }


# ─────────────────────────────────────────────────────────────
#  Node: Act — execute the tool the agent chose
# ─────────────────────────────────────────────────────────────

async def node_act(state: AgentState) -> AgentState:
    action = state.get("_next_action", "done")
    args = state.get("_next_args", {})

    if action == "done" or state["_is_final"]:
        state["status"] = "success"
        return state

    tool_fn = TOOL_REGISTRY.get(action)
    if not tool_fn:
        obs = f"Unknown tool: {action}"
        state["steps"][-1]["observation"] = obs
        state["status"] = "error"
        return state

    try:
        result = await tool_fn(**args)
        obs = json.dumps(result, default=str)

        # Track outcome
        if action == "resolve_violation":
            state["actions_taken"].append(f"Resolved violation: {args.get('reason', '')[:80]}")
            state["status"] = "success"
        elif action == "update_record_field":
            state["actions_taken"].append(
                f"Fixed field '{args.get('field')}' = {args.get('value')} on {args.get('record_id')}"
            )
        elif action == "escalate_violation":
            state["actions_taken"].append(f"Escalated: {args.get('reason', '')[:80]}")
            state["status"] = "escalated"

    except Exception as e:
        obs = f"Tool error: {e}"
        state["status"] = "error"

    # Attach observation to last reason step
    if state["steps"] and "action" in state["steps"][-1]:
        state["steps"][-1]["observation"] = obs

    return state


# ─────────────────────────────────────────────────────────────
#  Node: Reflect — check if done or loop
# ─────────────────────────────────────────────────────────────

async def node_reflect(state: AgentState) -> AgentState:
    state["iteration"] += 1

    if state["status"] in ("success", "escalated", "error"):
        # Compute final score
        score_data = await tool_get_compliance_score()
        state["score_after"] = score_data["compliance_score"]
        delta = round(state["score_after"] - state["score_before"], 1)
        delta_str = f"+{delta}%" if delta >= 0 else f"{delta}%"

        if state["status"] == "success":
            state["final_answer"] = (
                f"Agent successfully remediated violation {state['violation_id']}. "
                f"Actions: {'; '.join(state['actions_taken'])}. "
                f"Compliance score: {state['score_before']}% → {state['score_after']}% ({delta_str})."
            )
        elif state["status"] == "escalated":
            state["final_answer"] = (
                f"Agent escalated violation {state['violation_id']} for human review. "
                f"Reason: {state['actions_taken'][-1] if state['actions_taken'] else 'requires human action'}."
            )
        else:
            state["final_answer"] = f"Agent encountered an error processing {state['violation_id']}."

    return state


# ─────────────────────────────────────────────────────────────
#  Main Agent Runner
# ─────────────────────────────────────────────────────────────

async def run_agent(violation_id: str) -> AgentState:
    """
    Run the full ReAct agent on a single violation.
    Returns the final state with steps, actions_taken, and final_answer.
    """
    state = _init_state(violation_id)

    # Node 1: Perceive
    state = await node_perceive(state)

    # Check violation is valid and open
    if "error" in (state.get("violation") or {}):
        state["status"] = "error"
        state["final_answer"] = f"Violation {violation_id} not found."
        return state

    if state["violation"].get("status") not in ("open", None):
        state["status"] = "success"
        state["final_answer"] = (
            f"Violation {violation_id} is already {state['violation'].get('status')} — no action needed."
        )
        return state

    # ReAct loop: reason → act → reflect (max MAX_STEPS iterations)
    for _ in range(MAX_STEPS):
        state = await node_reason(state)
        state = await node_act(state)
        state = await node_reflect(state)

        if state["status"] in ("success", "escalated", "error"):
            break

        # Safety: if _is_final was set by LLM
        if state.get("_is_final"):
            state["status"] = "success"
            score_data = await tool_get_compliance_score()
            state["score_after"] = score_data["compliance_score"]
            state["final_answer"] = (
                f"Agent completed. Actions: {'; '.join(state['actions_taken']) or 'none'}."
            )
            break

    else:
        # Hit max steps
        state["status"] = "escalated"
        state["final_answer"] = (
            f"Agent reached max steps ({MAX_STEPS}) without resolution. "
            f"Violation {violation_id} escalated for human review."
        )
        await tool_escalate_violation(
            violation_id, f"Agent hit max steps ({MAX_STEPS}) — requires human review."
        )
        score_data = await tool_get_compliance_score()
        state["score_after"] = score_data["compliance_score"]

    return state


async def run_batch_agent(severity_filter: str = "critical") -> dict:
    """
    Run the agent on ALL open violations matching a severity filter.
    Returns a summary dict.
    """
    db = get_database()
    query: dict = {"status": "open"}
    if severity_filter and severity_filter != "all":
        query["severity"] = severity_filter

    violations = await db.violations.find(query, {"violation_id": 1}).to_list(50)
    results = []
    resolved = 0
    escalated = 0
    errors = 0

    for v in violations:
        vid = v.get("violation_id", "")
        if not vid:
            continue
        state = await run_agent(vid)
        results.append({
            "violation_id": vid,
            "status": state["status"],
            "summary": state["final_answer"],
            "actions": state["actions_taken"],
            "score_delta": round(state["score_after"] - state["score_before"], 1),
        })
        if state["status"] == "success":
            resolved += 1
        elif state["status"] == "escalated":
            escalated += 1
        else:
            errors += 1

    score_data = await tool_get_compliance_score()
    return {
        "total_processed": len(results),
        "resolved": resolved,
        "escalated": escalated,
        "errors": errors,
        "final_compliance_score": score_data["compliance_score"],
        "results": results,
    }


async def get_agent_log(limit: int = 50) -> list:
    """Fetch the agent action audit log."""
    db = get_database()
    docs = await db.agent_log.find().sort("timestamp", -1).limit(limit).to_list(limit)
    for d in docs:
        d.pop("_id", None)
        if isinstance(d.get("timestamp"), datetime):
            d["timestamp"] = d["timestamp"].isoformat()
    return docs
