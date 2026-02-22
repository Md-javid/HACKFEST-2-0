"""
PolicyPulse AI – MongoDB Connection
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from datetime import datetime, timezone, timedelta
import uuid

client: AsyncIOMotorClient = None
db = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=10000,
    )
    db = client[settings.DATABASE_NAME]

    # Create indexes
    await db.policies.create_index("policy_id")
    await db.rules.create_index("rule_id")
    await db.violations.create_index([("rule_id", 1), ("record_id", 1)])
    await db.violations.create_index("status")
    await db.violations.create_index("severity")
    await db.violations.create_index("detected_at")
    await db.violations.create_index("department")
    await db.scan_history.create_index("started_at")
    await db.company_records.create_index("record_id")
    await db.users.create_index("email", unique=True)

    print("[OK] Connected to MongoDB")

    count = await db.company_records.count_documents({})
    if count == 0:
        await seed_sample_data()

    # Migrate: convert any string detected_at → BSON datetime
    await _migrate_datetime_fields()


async def _migrate_datetime_fields():
    """One-time migration: convert string detected_at values to BSON datetime."""
    migrated = 0
    async for doc in db.violations.find({"detected_at": {"$type": "string"}}):
        try:
            dt_str = doc["detected_at"]
            # Handle timezone-aware ISO strings
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            dt_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
            await db.violations.update_one(
                {"_id": doc["_id"]},
                {"$set": {"detected_at": dt_utc}}
            )
            migrated += 1
        except Exception:
            pass
    if migrated:
        print(f"[DB] Migrated {migrated} violation detected_at strings → datetime")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("[X] Disconnected from MongoDB")


def get_database():
    return db


async def seed_sample_data():
    """Seed a full demo dataset: policy, rules, records, violations, scan history."""
    now = datetime.now(timezone.utc)
    POLICY_ID = "POL-DEMO0001"

    # ── Policy ────────────────────────────────────────────────────────────────
    policy = {
        "policy_id": POLICY_ID,
        "filename": "PolicyPulse_Demo_Compliance_Policy_v3.pdf",
        "filepath": "",
        "uploaded_at": now - timedelta(days=30),
        "page_count": 12,
        "extracted_text": "Comprehensive Data Protection and Security Policy v3.0",
        "text_length": 5400,
        "status": "active",
        "rule_count": 10,
        "description": "GDPR, SOC 2 Type II, and ISO 27001 compliance policy covering data protection, access control, encryption, and vendor management.",
        "ai_analysis": {
            "document_type": "Data Protection & Security Policy",
            "summary": "Covers GDPR Article 32, SOC 2 Type II, and ISO 27001.",
            "compliance_frameworks": ["GDPR", "SOC 2 Type II", "ISO 27001"],
            "status": "success",
        },
    }
    await db.policies.insert_one(policy)

    # ── Rules ─────────────────────────────────────────────────────────────────
    rules = [
        {"rule_id": "RULE-001", "policy_id": POLICY_ID, "condition": "All employee accounts must have MFA enabled",
         "required_action": "Enable MFA on all user accounts", "severity": "critical",
         "policy_reference": "SOC2 CC6.1 / ISO 27001 A.9.4", "category": "access_control",
         "applicable_record_types": ["employee"],
         "validation_logic": {"field": "mfa_enabled", "operator": "is_true", "value": True}},
        {"rule_id": "RULE-002", "policy_id": POLICY_ID, "condition": "All data stores must be encrypted at rest (AES-256)",
         "required_action": "Enable encryption on all data stores", "severity": "critical",
         "policy_reference": "GDPR Art. 32 / SOC2 CC6.7", "category": "encryption",
         "applicable_record_types": ["data_store", "server"],
         "validation_logic": {"field": "encryption_enabled", "operator": "is_true", "value": True}},
        {"rule_id": "RULE-003", "policy_id": POLICY_ID, "condition": "Employees must complete security training within 365 days",
         "required_action": "Complete annual security awareness training", "severity": "high",
         "policy_reference": "ISO 27001 A.7.2.2 / SOC2 CC1.4", "category": "training",
         "applicable_record_types": ["employee"],
         "validation_logic": {"field": "last_training_date", "operator": "date_within_days", "value": 365}},
        {"rule_id": "RULE-004", "policy_id": POLICY_ID, "condition": "All vendors must have a signed Data Processing Agreement",
         "required_action": "Execute and archive a signed DPA", "severity": "high",
         "policy_reference": "GDPR Art. 28", "category": "vendor_management",
         "applicable_record_types": ["vendor"],
         "validation_logic": {"field": "contract_signed", "operator": "is_true", "value": True}},
        {"rule_id": "RULE-005", "policy_id": POLICY_ID, "condition": "Production servers must have automated daily backups",
         "required_action": "Configure automated backup schedules", "severity": "high",
         "policy_reference": "ISO 27001 A.12.3 / SOC2 A1.2", "category": "data_protection",
         "applicable_record_types": ["server"],
         "validation_logic": {"field": "backup_enabled", "operator": "is_true", "value": True}},
        {"rule_id": "RULE-006", "policy_id": POLICY_ID, "condition": "Personal data must not be retained more than 730 days",
         "required_action": "Implement 2-year data retention policy", "severity": "medium",
         "policy_reference": "GDPR Art. 5(1)(e)", "category": "retention",
         "applicable_record_types": ["data_store"],
         "validation_logic": {"field": "retention_days", "operator": "less_than", "value": 730}},
        {"rule_id": "RULE-007", "policy_id": POLICY_ID, "condition": "All servers must have a valid SSL/TLS certificate",
         "required_action": "Renew and install valid SSL certificates", "severity": "high",
         "policy_reference": "SOC2 CC6.7", "category": "encryption",
         "applicable_record_types": ["server"],
         "validation_logic": {"field": "ssl_certificate_valid", "operator": "is_true", "value": True}},
        {"rule_id": "RULE-008", "policy_id": POLICY_ID, "condition": "Sensitive data access must follow least-privilege principles",
         "required_action": "Review and restrict access rights", "severity": "medium",
         "policy_reference": "ISO 27001 A.9.2.3", "category": "access_control",
         "applicable_record_types": ["employee", "data_store"],
         "validation_logic": {"field": "access_level", "operator": "not_equals", "value": "admin"}},
        {"rule_id": "RULE-009", "policy_id": POLICY_ID, "condition": "Audit logs must be reviewed at least every 90 days",
         "required_action": "Conduct quarterly audit log reviews", "severity": "medium",
         "policy_reference": "SOC2 CC7.2", "category": "audit",
         "applicable_record_types": ["all"],
         "validation_logic": {"field": "last_audit_date", "operator": "date_within_days", "value": 90}},
        {"rule_id": "RULE-010", "policy_id": POLICY_ID, "condition": "All data assets must have a classification label assigned",
         "required_action": "Assign data classification label", "severity": "low",
         "policy_reference": "ISO 27001 A.8.2", "category": "data_protection",
         "applicable_record_types": ["data_store"],
         "validation_logic": {"field": "data_classification", "operator": "exists", "value": True}},
    ]
    await db.rules.insert_many(rules)

    # ── Company Records ────────────────────────────────────────────────────────
    d = lambda days: (now - timedelta(days=days)).strftime("%Y-%m-%d")
    records = [
        {"record_id": "EMP-001", "type": "employee", "department": "Engineering", "source": "seed", "uploaded_at": now,
         "data": {"name": "Alice Chen", "email": "alice@company.com", "mfa_enabled": True,
                  "last_training_date": d(45), "access_level": "developer", "last_audit_date": d(30)}},
        {"record_id": "EMP-002", "type": "employee", "department": "HR", "source": "seed", "uploaded_at": now,
         "data": {"name": "Bob Martinez", "email": "bob@company.com", "mfa_enabled": False,
                  "last_training_date": d(400), "access_level": "manager", "last_audit_date": d(100)}},
        {"record_id": "EMP-003", "type": "employee", "department": "Finance", "source": "seed", "uploaded_at": now,
         "data": {"name": "Carol Davis", "email": "carol@company.com", "mfa_enabled": True,
                  "last_training_date": d(200), "access_level": "user", "last_audit_date": d(45)}},
        {"record_id": "EMP-004", "type": "employee", "department": "Engineering", "source": "seed", "uploaded_at": now,
         "data": {"name": "David Park", "email": "david@company.com", "mfa_enabled": True,
                  "last_training_date": d(90), "access_level": "developer", "last_audit_date": d(25)}},
        {"record_id": "EMP-005", "type": "employee", "department": "Marketing", "source": "seed", "uploaded_at": now,
         "data": {"name": "Emma Wilson", "email": "emma@company.com", "mfa_enabled": False,
                  "last_training_date": d(100), "access_level": "user", "last_audit_date": d(60)}},
        {"record_id": "SRV-001", "type": "server", "department": "Infrastructure", "source": "seed", "uploaded_at": now,
         "data": {"name": "web-frontend-01", "ip": "10.0.1.1", "encryption_enabled": True,
                  "backup_enabled": True, "ssl_certificate_valid": True, "last_audit_date": d(15)}},
        {"record_id": "SRV-002", "type": "server", "department": "Infrastructure", "source": "seed", "uploaded_at": now,
         "data": {"name": "prod-db-01", "ip": "10.0.1.2", "encryption_enabled": False,
                  "backup_enabled": True, "ssl_certificate_valid": True, "last_audit_date": d(40)}},
        {"record_id": "SRV-003", "type": "server", "department": "Engineering", "source": "seed", "uploaded_at": now,
         "data": {"name": "staging-api-01", "ip": "10.0.2.1", "encryption_enabled": True,
                  "backup_enabled": False, "ssl_certificate_valid": True, "last_audit_date": d(55)}},
        {"record_id": "VND-001", "type": "vendor", "department": "Procurement", "source": "seed", "uploaded_at": now,
         "data": {"name": "AWS Inc.", "service": "Cloud Infrastructure", "contract_signed": True,
                  "last_audit_date": d(20), "data_access": "infrastructure"}},
        {"record_id": "VND-002", "type": "vendor", "department": "Marketing", "source": "seed", "uploaded_at": now,
         "data": {"name": "SendGrid Analytics", "service": "Email Analytics", "contract_signed": False,
                  "last_audit_date": d(120), "data_access": "email_data"}},
        {"record_id": "DS-001", "type": "data_store", "department": "Engineering", "source": "seed", "uploaded_at": now,
         "data": {"name": "Customer Database", "location": "AWS RDS", "encryption_enabled": True,
                  "data_classification": "confidential", "retention_days": 365,
                  "personal_data": True, "last_audit_date": d(20)}},
        {"record_id": "DS-002", "type": "data_store", "department": "Marketing", "source": "seed", "uploaded_at": now,
         "data": {"name": "Analytics Data Warehouse", "location": "GCP BigQuery",
                  "encryption_enabled": True, "data_classification": None,
                  "retention_days": 800, "personal_data": True, "last_audit_date": d(100)}},
        {"record_id": "DS-003", "type": "data_store", "department": "Finance", "source": "seed", "uploaded_at": now,
         "data": {"name": "Financial Records Store", "location": "On-premise",
                  "encryption_enabled": False, "data_classification": "restricted",
                  "retention_days": 2555, "personal_data": False, "last_audit_date": d(85)}},
    ]
    await db.company_records.insert_many(records)

    # ── Violations ────────────────────────────────────────────────────────────
    violations = [
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-001", "record_id": "EMP-002",
         "violated_rule": "All employee accounts must have MFA enabled",
         "explanation": "Bob Martinez (EMP-002) has mfa_enabled = false, directly violating mandatory MFA policy SOC2 CC6.1.",
         "suggested_remediation": "Immediately enforce MFA enrollment for Bob Martinez via IT helpdesk.",
         "severity": "critical", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=5)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-001", "record_id": "EMP-005",
         "violated_rule": "All employee accounts must have MFA enabled",
         "explanation": "Emma Wilson (EMP-005) has mfa_enabled = false, violating mandatory MFA requirement.",
         "suggested_remediation": "Enforce MFA enrollment for Emma Wilson within 24 hours.",
         "severity": "critical", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=3)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-002", "record_id": "SRV-002",
         "violated_rule": "All data stores must be encrypted at rest (AES-256)",
         "explanation": "prod-db-01 (SRV-002) has encryption_enabled = false, exposing data at rest in violation of GDPR Art. 32.",
         "suggested_remediation": "Enable AES-256 encryption on prod-db-01 and schedule maintenance window.",
         "severity": "critical", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=10)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-003", "record_id": "EMP-002",
         "violated_rule": "Employees must complete security training within 365 days",
         "explanation": "Bob Martinez last completed training 400 days ago, exceeding the 365-day requirement.",
         "suggested_remediation": "Schedule security awareness training for Bob Martinez immediately.",
         "severity": "high", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=35)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-004", "record_id": "VND-002",
         "violated_rule": "All vendors must have a signed Data Processing Agreement",
         "explanation": "SendGrid Analytics (VND-002) has contract_signed = false. Sharing data without a DPA violates GDPR Art. 28.",
         "suggested_remediation": "Contact SendGrid Analytics to execute a DPA before any further data sharing.",
         "severity": "high", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=8)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-005", "record_id": "SRV-003",
         "violated_rule": "Production servers must have automated daily backups",
         "explanation": "staging-api-01 (SRV-003) has backup_enabled = false. Risk of unrecoverable data loss.",
         "suggested_remediation": "Configure automated daily snapshots for staging-api-01.",
         "severity": "high", "status": "reviewed", "confidence_score": 0.95,
         "detected_at": now - timedelta(days=20),
         "reviewed_at": now - timedelta(days=15)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-006", "record_id": "DS-002",
         "violated_rule": "Personal data must not be retained more than 730 days",
         "explanation": "Analytics Data Warehouse (DS-002) retains data for 800 days, exceeding the 730-day GDPR maximum.",
         "suggested_remediation": "Update retention policy to 730 days and purge data older than 2 years.",
         "severity": "medium", "status": "resolved", "confidence_score": 0.98,
         "detected_at": now - timedelta(days=25),
         "resolved_at": now - timedelta(days=10)},
        {"violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
         "rule_id": "RULE-010", "record_id": "DS-002",
         "violated_rule": "All data assets must have a classification label assigned",
         "explanation": "Analytics Data Warehouse (DS-002) has no data classification label — required by ISO 27001 A.8.2.",
         "suggested_remediation": "Assign 'confidential' classification label to Analytics Data Warehouse.",
         "severity": "low", "status": "open", "confidence_score": 1.0,
         "detected_at": now - timedelta(days=15)},
    ]
    await db.violations.insert_many(violations)

    # ── Scan history ──────────────────────────────────────────────────────────
    await db.scan_history.insert_one({
        "scan_id": "SCAN-SEED0001",
        "status": "completed",
        "started_at": now - timedelta(hours=2),
        "completed_at": now - timedelta(hours=1, minutes=50),
        "violations_found": len(violations),
        "records_scanned": len(records),
        "rules_applied": len(rules),
    })

    print(f"[OK] Seeded demo data: 1 policy, {len(rules)} rules, {len(records)} records, {len(violations)} violations")
