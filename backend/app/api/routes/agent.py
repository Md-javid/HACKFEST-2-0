"""
PolicyPulse — Agentic AI System Routes

ReAct Agent (single-agent):
  POST /api/agent/remediate/{violation_id}  — Run ReAct agent on one violation
  POST /api/agent/remediate-batch           — Run agent on all open violations
  GET  /api/agent/log                       — Fetch agent action audit log

Multi-Agent Orchestrator:
  POST /api/agent/orchestrate/{violation_id} — Smart-route to specialist agent
  POST /api/agent/orchestrate-batch          — Run orchestrator on all violations

Proactive Intelligence:
  POST /api/agent/predict-risks              — Risk Prediction Agent
  POST /api/agent/suggest-policies           — Policy Advisor Agent
  GET  /api/agent/status                     — Agent system health & stats
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.agent_service import run_agent, run_batch_agent, get_agent_log
from app.services.orchestrator_service import (
    run_orchestrator,
    run_orchestrator_batch,
    get_agent_system_status,
)
from app.services.risk_predictor_service import run_risk_prediction
from app.services.policy_advisor_service import run_policy_advisor

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/remediate/{violation_id}")
async def remediate_violation(violation_id: str):
    """
    Run the ReAct compliance agent on a single violation.
    The agent will:
      1. Perceive — load violation, rule, and record from DB
      2. Reason   — Gemini (or deterministic fallback) decides the action
      3. Act      — resolves, fixes data field, or escalates
      4. Reflect  — loops up to 5 times if needed
    Returns the full agent trace with steps and final answer.
    """
    try:
        state = await run_agent(violation_id)
        return {
            "violation_id": violation_id,
            "status": state["status"],
            "final_answer": state["final_answer"],
            "actions_taken": state["actions_taken"],
            "score_before": state["score_before"],
            "score_after": state["score_after"],
            "score_delta": round(state["score_after"] - state["score_before"], 1),
            "steps": state["steps"],
            "iterations": state["iteration"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remediate-batch")
async def remediate_batch(
    severity: Optional[str] = Query(
        default="critical",
        description="Filter violations by severity: critical, high, medium, low, all"
    )
):
    """
    Run the agent on all open violations matching the severity filter.
    Processes up to 50 violations. Returns a summary report.
    """
    try:
        result = await run_batch_agent(severity_filter=severity or "critical")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/log")
async def agent_log(limit: int = Query(default=50, le=200)):
    """Fetch the agent action audit log (most recent first)."""
    try:
        logs = await get_agent_log(limit=limit)
        return {"logs": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
#  Multi-Agent Orchestrator
# ─────────────────────────────────────────────────────────────

@router.post("/orchestrate/{violation_id}")
async def orchestrate_violation(violation_id: str):
    """
    Run the Multi-Agent Orchestrator on a single violation.
    The orchestrator classifies the violation and routes it to the correct
    specialist agent: SecurityAgent, PrivacyAgent, VendorAgent, or OperationsAgent.
    Each specialist uses domain-specific playbooks for maximum accuracy.
    """
    try:
        result = await run_orchestrator(violation_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orchestrate-batch")
async def orchestrate_batch(
    severity: Optional[str] = Query(
        default="all",
        description="Filter by severity: critical, high, medium, low, all"
    )
):
    """
    Run the Multi-Agent Orchestrator on all open violations.
    Each violation is classified and routed to the appropriate specialist.
    Returns per-agent statistics and full results.
    """
    try:
        result = await run_orchestrator_batch(severity_filter=severity or "all")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────
#  Proactive Intelligence Agents
# ─────────────────────────────────────────────────────────────

@router.post("/predict-risks")
async def predict_risks(
    record_type: Optional[str] = Query(default=None, description="Filter by record type"),
    department: Optional[str] = Query(default=None, description="Filter by department"),
    min_risk_score: int = Query(default=2, ge=1, le=5, description="Minimum risk score (1-5)"),
):
    """
    Run the Risk Prediction Agent — identifies records that are likely to
    generate violations on the next scan, BEFORE they actually fail.

    Detection strategies:
    - Field missing from record data
    - Boolean field set to wrong value
    - Date fields near expiry (within 30 days)
    - Numeric fields outside acceptable range
    - Pattern spreading — same issue in same department
    """
    try:
        result = await run_risk_prediction(
            record_type=record_type,
            department=department,
            min_risk_score=min_risk_score,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-policies")
async def suggest_policies():
    """
    Run the Policy Advisor Agent — analyzes violation patterns and generates
    actionable policy improvement recommendations.

    Analysis performed:
    - Frequently triggered rules (suggest severity upgrades)
    - Repeat offenders (same record violating same rule multiple times)
    - Coverage gaps (record fields not covered by any rule)
    - Suggested new rules based on observed fields
    """
    try:
        result = await run_policy_advisor()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def agent_system_status():
    """
    Get the real-time status of the entire agentic AI system.
    Returns: compliance score, open violations, agent activity stats,
    specialist agent roster, and recent activity log.
    """
    try:
        result = await get_agent_system_status()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
