"""
PolicyPulse AI – Dashboard & Reporting Routes
"""
from fastapi import APIRouter, Query
from typing import Optional, List
from app.core.database import get_database
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics."""
    db = get_database()

    total_policies = await db.policies.count_documents({})
    total_rules = await db.rules.count_documents({})
    total_violations = await db.violations.count_documents({})
    open_violations = await db.violations.count_documents({"status": "open"})
    records_monitored = await db.company_records.count_documents({})

    # Severity breakdown
    severity_pipeline = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    severity_data = {}
    async for doc in db.violations.aggregate(severity_pipeline):
        severity_data[doc["_id"]] = doc["count"]

    critical = severity_data.get("critical", 0)
    high = severity_data.get("high", 0)
    medium = severity_data.get("medium", 0)
    low = severity_data.get("low", 0)

    # Compliance score: 100 - (weighted violations / total records * 100)
    if records_monitored > 0 and total_rules > 0:
        max_possible = records_monitored * total_rules
        weighted_violations = (critical * 4 + high * 3 + medium * 2 + low * 1)
        score = max(0, 100 - (weighted_violations / max_possible * 100 * 5))
        compliance_score = round(min(score, 100), 1)
    else:
        compliance_score = 100.0

    # Last scan
    last_scan_doc = await db.scan_history.find_one(
        {"status": "completed"},
        sort=[("completed_at", -1)]
    )
    last_scan = last_scan_doc["completed_at"] if last_scan_doc else None

    # Violations trend (last 7 days simulated)
    violations_trend = []
    for i in range(7, 0, -1):
        date = datetime.utcnow() - timedelta(days=i)
        count = await db.violations.count_documents({
            "detected_at": {"$lte": date}
        })
        violations_trend.append({
            "date": date.strftime("%Y-%m-%d"),
            "violations": count
        })

    # Recent violations
    recent = await db.violations.find().sort(
        "detected_at", -1
    ).limit(5).to_list(length=5)
    for r in recent:
        r["_id"] = str(r["_id"])

    return {
        "total_policies": total_policies,
        "total_rules": total_rules,
        "total_violations": total_violations,
        "open_violations": open_violations,
        "compliance_score": compliance_score,
        "critical_violations": critical,
        "high_violations": high,
        "medium_violations": medium,
        "low_violations": low,
        "last_scan": last_scan,
        "records_monitored": records_monitored,
        "violations_by_severity": severity_data,
        "violations_trend": violations_trend,
        "recent_violations": recent,
    }


@router.get("/rules")
async def get_rules(policy_id: Optional[str] = None):
    """List all compliance rules."""
    db = get_database()
    query = {}
    if policy_id:
        query["policy_id"] = policy_id

    rules = await db.rules.find(query).to_list(length=500)
    for r in rules:
        r["_id"] = str(r["_id"])

    return {"rules": rules, "total": len(rules)}


@router.get("/records")
async def get_company_records(
    record_type: Optional[str] = None,
    department: Optional[str] = None,
):
    """List company records being monitored."""
    db = get_database()
    query = {}
    if record_type:
        query["type"] = record_type
    if department:
        query["department"] = department

    records = await db.company_records.find(query).to_list(length=1000)
    for r in records:
        r["_id"] = str(r["_id"])

    return {"records": records, "total": len(records)}


@router.get("/scan-history")
async def get_scan_history(limit: int = 20):
    """Get scan history."""
    db = get_database()
    scans = await db.scan_history.find().sort(
        "started_at", -1
    ).limit(limit).to_list(length=limit)

    for s in scans:
        s["_id"] = str(s["_id"])

    return {"scans": scans, "total": len(scans)}


@router.get("/report")
async def generate_report(include_resolved: bool = False):
    """Generate a compliance audit report as JSON."""
    db = get_database()

    query = {}
    if not include_resolved:
        query["status"] = {"$ne": "resolved"}

    violations = await db.violations.find(query).sort("severity", 1).to_list(length=5000)
    for v in violations:
        v["_id"] = str(v["_id"])

    rules = await db.rules.find().to_list(length=500)
    for r in rules:
        r["_id"] = str(r["_id"])

    policies = await db.policies.find({}, {"extracted_text": 0}).to_list(length=100)
    for p in policies:
        p["_id"] = str(p["_id"])

    total_records = await db.company_records.count_documents({})

    severity_counts = {}
    for v in violations:
        sev = v.get("severity", "unknown")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "report_title": "PolicyPulse AI – Compliance Audit Report",
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_policies": len(policies),
            "total_rules": len(rules),
            "total_violations": len(violations),
            "records_monitored": total_records,
            "severity_breakdown": severity_counts,
        },
        "policies": policies,
        "violations": violations,
        "rules": rules,
    }


@router.post("/reset")
async def reset_demo():
    """Reset all data for a clean demo."""
    db = get_database()
    await db.policies.delete_many({})
    await db.rules.delete_many({})
    await db.violations.delete_many({})
    await db.scan_history.delete_many({})
    await db.company_records.delete_many({})

    # Re-seed sample data
    from app.core.database import seed_sample_data
    await seed_sample_data()

    return {"message": "All data reset. Sample company records re-seeded."}
