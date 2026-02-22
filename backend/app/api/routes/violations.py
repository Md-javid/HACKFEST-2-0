"""
PolicyPulse AI – Violation Detection & Management Routes
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import Optional, List
from app.core.database import get_database
from app.services.rule_engine import run_compliance_scan
from datetime import datetime

router = APIRouter(prefix="/violations", tags=["Violations"])


@router.get("/")
async def list_violations(
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    department: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
):
    """List all violations with optional filters."""
    db = get_database()
    query = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    if department:
        query["department"] = department

    total = await db.violations.count_documents(query)
    violations = await db.violations.find(query).sort(
        "detected_at", -1
    ).skip(skip).limit(limit).to_list(length=limit)

    for v in violations:
        v["_id"] = str(v["_id"])

    return {"violations": violations, "total": total, "skip": skip, "limit": limit}


@router.get("/summary")
async def violations_summary():
    """Get violation summary statistics."""
    db = get_database()

    pipeline_severity = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    pipeline_status = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    pipeline_department = [
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]

    by_severity = {d["_id"]: d["count"] async for d in db.violations.aggregate(pipeline_severity)}
    by_status = {d["_id"]: d["count"] async for d in db.violations.aggregate(pipeline_status)}
    by_department = {d["_id"]: d["count"] async for d in db.violations.aggregate(pipeline_department)}

    return {
        "by_severity": by_severity,
        "by_status": by_status,
        "by_department": by_department,
        "total": sum(by_status.values()) if by_status else 0,
    }


@router.get("/{violation_id}")
async def get_violation(violation_id: str):
    """Get detailed violation information."""
    db = get_database()
    violation = await db.violations.find_one({"violation_id": violation_id})
    if not violation:
        raise HTTPException(status_code=404, detail="Violation not found")

    violation["_id"] = str(violation["_id"])

    # Get associated rule
    rule = await db.rules.find_one({"rule_id": violation.get("rule_id")})
    if rule:
        rule["_id"] = str(rule["_id"])

    # Get associated record
    record = await db.company_records.find_one({"record_id": violation.get("record_id")})
    if record:
        record["_id"] = str(record["_id"])

    return {"violation": violation, "rule": rule, "record": record}


@router.patch("/{violation_id}/action")
async def violation_action(violation_id: str, action: str, reviewer: str = "System Admin"):
    """Approve, escalate, or resolve a violation."""
    db = get_database()

    valid_actions = {
        "approve": "approved",
        "escalate": "escalated",
        "resolve": "resolved",
        "review": "reviewed",
    }

    if action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {list(valid_actions.keys())}"
        )

    result = await db.violations.update_one(
        {"violation_id": violation_id},
        {"$set": {
            "status": valid_actions[action],
            "reviewed_by": reviewer,
            "reviewed_at": datetime.utcnow(),
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Violation not found")

    return {"message": f"Violation {violation_id} marked as {valid_actions[action]}", "status": valid_actions[action]}


@router.post("/scan")
async def trigger_scan(background_tasks: BackgroundTasks):
    """Trigger a compliance scan — starts immediately in background, returns instantly."""
    background_tasks.add_task(run_compliance_scan)
    return {"message": "Compliance scan started in background", "status": "running"}


@router.delete("/clear")
async def clear_violations():
    """Clear all violations (for demo reset)."""
    db = get_database()
    result = await db.violations.delete_many({})
    await db.scan_history.delete_many({})
    return {"message": f"Cleared {result.deleted_count} violations and scan history"}
