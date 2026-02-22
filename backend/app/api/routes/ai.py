"""
PolicyPulse AI – Agentic AI Routes

Endpoints:
  POST /api/ai/chat          – Gemini chatbot with live compliance context
  GET  /api/ai/overview      – Agentic compliance overview (autonomous analysis)
  POST /api/ai/analyze-text  – Analyze arbitrary policy text snippet
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_database
from app.services.ai_service import (
    chat_with_compliance_ai,
    generate_compliance_overview,
    call_ai,
    clean_json_response,
)

router = APIRouter(prefix="/ai", tags=["AI"])

PREDEFINED_QUESTIONS = [
    "What is my current compliance score and what's driving it?",
    "Which violations need my immediate attention today?",
    "Which records are most at risk of non-compliance?",
    "Summarize the latest compliance scan results.",
    "What are the top 3 risks in my organization right now?",
    "How can I improve my data protection compliance?",
    "Which employees are missing security training?",
    "Are there any critical encryption violations?",
    "What vendor-related compliance issues exist?",
    "Give me an action plan to reach 90% compliance.",
]


class ChatRequest(BaseModel):
    question: str
    include_context: bool = True


async def _build_context(db) -> dict:
    """Fetch live data from MongoDB to give Gemini accurate context."""
    try:
        # Violations summary
        violations = await db.violations.find(
            {"status": "open"}, {"rule_condition": 1, "severity": 1, "record_id": 1, "status": 1}
        ).sort("severity", 1).limit(20).to_list(20)
        for v in violations:
            v.pop("_id", None)

        # Rules summary
        rules = await db.rules.find(
            {}, {"condition": 1, "severity": 1, "category": 1, "policy_id": 1}
        ).limit(20).to_list(20)
        for r in rules:
            r.pop("_id", None)

        # Stats
        total_violations = await db.violations.count_documents({})
        open_violations = await db.violations.count_documents({"status": "open"})
        resolved_violations = await db.violations.count_documents({"status": "resolved"})
        total_rules = await db.rules.count_documents({})
        total_records = await db.company_records.count_documents({})
        total_policies = await db.policies.count_documents({})

        # Severity breakdown
        critical = await db.violations.count_documents({"severity": "critical", "status": "open"})
        high = await db.violations.count_documents({"severity": "high", "status": "open"})
        medium = await db.violations.count_documents({"severity": "medium", "status": "open"})
        low = await db.violations.count_documents({"severity": "low", "status": "open"})

        compliance_score = 0
        if total_rules > 0:
            compliance_score = round(((total_rules - open_violations) / max(total_rules, 1)) * 100)
            compliance_score = max(0, min(100, compliance_score))

        return {
            "compliance_score": compliance_score,
            "total_violations": total_violations,
            "open_violations": open_violations,
            "resolved_violations": resolved_violations,
            "total_rules": total_rules,
            "total_records": total_records,
            "total_policies": total_policies,
            "severity_breakdown": {"critical": critical, "high": high, "medium": medium, "low": low},
            "recent_open_violations": violations[:10],
            "active_rules_sample": rules[:10],
        }
    except Exception as e:
        return {"error": str(e), "note": "Could not fetch live context"}


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat with the compliance AI assistant.
    Sends the question to Gemini along with live compliance data as context.
    """
    db = get_database()
    context = await _build_context(db) if request.include_context else {}

    result = await chat_with_compliance_ai(request.question, context)
    return result


@router.get("/overview")
async def get_compliance_overview():
    """
    Agentic AI feature: autonomously analyzes all compliance data and returns
    an executive overview with top risks, immediate actions, and trend insight.
    """
    db = get_database()
    context = await _build_context(db)
    overview = await generate_compliance_overview(context)
    return overview


@router.get("/questions")
async def get_predefined_questions():
    """Return the list of predefined chat questions for the UI."""
    return {"questions": PREDEFINED_QUESTIONS}


@router.post("/analyze-text")
async def analyze_policy_text(body: dict):
    """
    Analyze a freeform policy text snippet using Gemini.
    Body: {"text": "...policy text..."}
    """
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="'text' field is required")
    if len(text) > 8000:
        text = text[:8000]

    prompt = f"""You are a compliance expert. Analyze this policy text and identify:
1. The main compliance requirement
2. Which regulatory framework it references (GDPR, SOC2, ISO27001, HIPAA, etc.)
3. The severity level (critical/high/medium/low)
4. Who it applies to
5. How to verify compliance

TEXT: {text}

Respond in clear plain English with numbered points. Be concise."""

    try:
        answer = call_ai(prompt, temperature=0.3)
        return {"analysis": answer.strip(), "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
