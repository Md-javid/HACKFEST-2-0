"""
PolicyPulse AI – Policy Ingestion Routes
"""
from fastapi import APIRouter, BackgroundTasks, UploadFile, File, HTTPException
from datetime import datetime
from app.core.database import get_database
from app.utils.pdf_parser import extract_text_from_pdf
from app.services.ai_service import analyze_pdf_async, extract_rules_async
import uuid
import os
from app.core.config import settings

router = APIRouter(prefix="/policies", tags=["Policies"])


# ──────────── Background AI Processing ────────────

async def _ai_process_policy(policy_id: str, extracted_text: str) -> None:
    """Runs AI analysis + rule extraction in the background after upload returns."""
    db = get_database()
    try:
        # Run both in parallel
        import asyncio
        pdf_analysis, rules = await asyncio.gather(
            analyze_pdf_async(extracted_text),
            extract_rules_async(extracted_text, policy_id),
        )

        if rules:
            await db.rules.insert_many(rules)

        await db.policies.update_one(
            {"policy_id": policy_id},
            {"$set": {
                "status": "active",
                "rule_count": len(rules),
                "ai_analysis": pdf_analysis,
            }}
        )
        print(f"[OK] Policy {policy_id} processed: {len(rules)} rules extracted.")
    except Exception as e:
        print(f"[ERROR] Background AI processing failed for {policy_id}: {e}")
        await db.policies.update_one(
            {"policy_id": policy_id},
            {"$set": {"status": "error", "ai_analysis": {"status": "error", "summary": str(e)}}}
        )


@router.post("/upload")
async def upload_policy(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """Upload a PDF policy document. Returns immediately — AI analysis runs in the background."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    db = get_database()
    file_bytes = await file.read()

    # Extract text (fast — pure Python, no network)
    try:
        extracted_text, page_count = extract_text_from_pdf(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from this PDF")

    # Save file to disk
    policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
    filepath = os.path.join(settings.UPLOAD_DIR, f"{policy_id}_{file.filename}")
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # Store policy immediately with status=processing
    policy_doc = {
        "policy_id": policy_id,
        "filename": file.filename,
        "filepath": filepath,
        "uploaded_at": datetime.utcnow(),
        "page_count": page_count,
        "extracted_text": extracted_text,
        "text_length": len(extracted_text),
        "status": "processing",
        "rule_count": 0,
        "ai_analysis": {"status": "processing", "summary": "AI analysis is running in the background…"},
    }
    await db.policies.insert_one(policy_doc)

    # Queue AI work — runs after this response is sent
    background_tasks.add_task(_ai_process_policy, policy_id, extracted_text)

    return {
        "policy_id": policy_id,
        "filename": file.filename,
        "page_count": page_count,
        "extracted_text_length": len(extracted_text),
        "rules_extracted": 0,
        "status": "processing",
        "message": f"✓ Policy '{file.filename}' uploaded ({page_count} pages). AI is extracting rules in the background — refresh in 20–30 seconds.",
    }


@router.get("/")
async def list_policies():
    """List all uploaded policies."""
    db = get_database()
    policies = await db.policies.find(
        {}, {"extracted_text": 0}
    ).sort("uploaded_at", -1).to_list(length=100)

    for p in policies:
        p["_id"] = str(p["_id"])

    return {"policies": policies, "total": len(policies)}


@router.get("/{policy_id}")
async def get_policy(policy_id: str):
    """Get a specific policy with its rules."""
    db = get_database()
    policy = await db.policies.find_one({"policy_id": policy_id})
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    policy["_id"] = str(policy["_id"])
    rules = await db.rules.find({"policy_id": policy_id}).to_list(length=500)
    for r in rules:
        r["_id"] = str(r["_id"])

    return {"policy": policy, "rules": rules}


@router.delete("/{policy_id}")
async def delete_policy(policy_id: str):
    """Delete a policy and its associated rules."""
    db = get_database()
    result = await db.policies.delete_one({"policy_id": policy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Policy not found")

    await db.rules.delete_many({"policy_id": policy_id})
    return {"message": f"Policy {policy_id} and associated rules deleted"}


@router.post("/{policy_id}/analyze")
async def reanalyze_policy(policy_id: str, background_tasks: BackgroundTasks = BackgroundTasks()):
    """Re-trigger AI analysis and rule extraction for an existing policy."""
    db = get_database()
    policy = await db.policies.find_one({"policy_id": policy_id})
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    extracted_text = policy.get("extracted_text", "")
    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="No extracted text found for this policy — re-upload the PDF.")

    # Mark as processing immediately; clear old rules
    await db.policies.update_one(
        {"policy_id": policy_id},
        {"$set": {
            "status": "processing",
            "rule_count": 0,
            "ai_analysis": {"status": "processing", "summary": "AI analysis is running in the background…"},
        }}
    )
    await db.rules.delete_many({"policy_id": policy_id})

    background_tasks.add_task(_ai_process_policy, policy_id, extracted_text)

    return {"policy_id": policy_id, "status": "processing", "message": "AI analysis started — refresh in 20–30 seconds."}


@router.post("/demo-upload")
async def demo_upload(background_tasks: BackgroundTasks = BackgroundTasks()):
    """Create a demo policy using Gemini AI to generate realistic compliance rules."""
    db = get_database()
    policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"

    demo_text = (
        "Comprehensive Data Protection and Security Policy v3.0\n\n"
        "This policy establishes mandatory compliance requirements for all employees, "
        "systems, and third-party vendors. It covers GDPR, SOC 2 Type II, and ISO 27001 "
        "requirements including: multi-factor authentication, data encryption at rest and in transit, "
        "annual security training, vendor data processing agreements, automated backups, "
        "SSL certificate management, least-privilege access control, quarterly audit log reviews, "
        "a 2-year data retention policy, and mandatory data classification labels."
    )

    policy_doc = {
        "policy_id": policy_id,
        "filename": "PolicyPulse_Demo_Compliance_Policy_v3.pdf",
        "filepath": "",
        "uploaded_at": datetime.utcnow(),
        "page_count": 12,
        "extracted_text": demo_text,
        "text_length": len(demo_text),
        "status": "processing",
        "rule_count": 0,
        "ai_analysis": {
            "document_type": "Data Protection & Security Policy",
            "summary": "Comprehensive compliance policy covering GDPR, SOC 2 Type II, and ISO 27001 requirements.",
            "compliance_frameworks": ["GDPR", "SOC 2 Type II", "ISO 27001"],
            "key_requirements": [
                "MFA for all accounts", "AES-256 encryption at rest",
                "Annual security training", "Vendor DPA agreements",
                "Automated daily backups", "Valid SSL certificates",
                "Least-privilege access", "Quarterly audit reviews",
            ],
            "risk_areas": ["Access Control", "Data Protection", "Vendor Risk", "Encryption"],
            "estimated_rule_count": 10,
            "status": "success",
        },
    }
    await db.policies.insert_one(policy_doc)

    # Queue rule generation in background
    from app.services.ai_service import generate_demo_rules_with_ai

    async def _gen_demo_rules(pid: str):
        try:
            r = await generate_demo_rules_with_ai(pid)
            await db.rules.insert_many(r)
            await db.policies.update_one({"policy_id": pid}, {"$set": {"status": "active", "rule_count": len(r)}})
        except Exception as exc:
            print(f"[ERROR] Demo rule gen failed: {exc}")
            await db.policies.update_one({"policy_id": pid}, {"$set": {"status": "error"}})

    background_tasks.add_task(_gen_demo_rules, policy_id)

    return {
        "policy_id": policy_id,
        "filename": "PolicyPulse_Demo_Compliance_Policy_v3.pdf",
        "rules_extracted": 0,
        "status": "processing",
        "message": f"Demo policy created — AI is generating compliance rules in the background. Refresh in ~15 seconds.",
    }
