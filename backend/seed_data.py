#!/usr/bin/env python3
"""
PolicyPulse AI — Sample Dataset Seeder
=======================================
Seeds MongoDB with realistic sample data for testing:
  - 1 admin user + 2 regular users
  - 1 demo policy with 10 compliance rules (GDPR / SOC2 / ISO27001)
  - 20 company records (employees, servers, vendors, data stores)
  - 8 compliance violations (various severities)

Usage:
    cd backend
    python seed_data.py

Requirements: MongoDB running on localhost:27017
"""
import asyncio
from datetime import datetime, timedelta
import random
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "policypulse"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Users ────────────────────────────────────────────────────────────────────

USERS = [
    {
        "email": "admin@policypulse.ai",
        "name": "Alex Admin",
        "password": "admin123",
        "role": "admin",
        "organization": "PolicyPulse Corp",
    },
    {
        "email": "officer@policypulse.ai",
        "name": "Sarah Officer",
        "password": "officer123",
        "role": "compliance_officer",
        "organization": "PolicyPulse Corp",
    },
    {
        "email": "viewer@policypulse.ai",
        "name": "John Viewer",
        "password": "viewer123",
        "role": "viewer",
        "organization": "PolicyPulse Corp",
    },
]


# ─── Policy ───────────────────────────────────────────────────────────────────

POLICY_ID = "POL-DEMO0001"

POLICY_DOC = {
    "policy_id": POLICY_ID,
    "filename": "PolicyPulse_Demo_Compliance_Policy_v3.pdf",
    "filepath": "",
    "uploaded_at": datetime.utcnow() - timedelta(days=30),
    "page_count": 12,
    "extracted_text": "Comprehensive Data Protection and Security Policy v3.0 - GDPR, SOC2, ISO27001",
    "text_length": 5400,
    "status": "active",
    "rule_count": 10,
    "ai_analysis": {
        "document_type": "Data Protection & Security Policy",
        "summary": "Comprehensive compliance policy covering GDPR Article 32, SOC 2 Type II, and ISO 27001 requirements for data protection, access control, encryption, and vendor management.",
        "compliance_frameworks": ["GDPR", "SOC 2 Type II", "ISO 27001"],
        "key_requirements": [
            "MFA for all user accounts",
            "AES-256 encryption at rest",
            "Annual security awareness training",
            "Vendor Data Processing Agreements",
            "Automated daily backups",
            "Valid SSL certificates",
            "Least-privilege access control",
            "Quarterly audit log reviews",
        ],
        "risk_areas": ["Access Control", "Data Protection", "Vendor Risk", "Encryption"],
        "estimated_rule_count": 10,
        "status": "success",
    },
}


# ─── Rules ────────────────────────────────────────────────────────────────────

RULES = [
    {
        "rule_id": "RULE-001", "policy_id": POLICY_ID,
        "condition": "All employee accounts must have MFA enabled",
        "required_action": "Enable MFA on all user accounts without exception",
        "severity": "critical", "policy_reference": "SOC2 CC6.1 / ISO 27001 A.9.4",
        "category": "access_control", "applicable_record_types": ["employee"],
        "validation_logic": {"field": "mfa_enabled", "operator": "is_true", "value": True},
    },
    {
        "rule_id": "RULE-002", "policy_id": POLICY_ID,
        "condition": "All data stores must be encrypted at rest (AES-256)",
        "required_action": "Enable encryption on all data stores and servers",
        "severity": "critical", "policy_reference": "GDPR Art. 32 / SOC2 CC6.7",
        "category": "encryption", "applicable_record_types": ["data_store", "server"],
        "validation_logic": {"field": "encryption_enabled", "operator": "is_true", "value": True},
    },
    {
        "rule_id": "RULE-003", "policy_id": POLICY_ID,
        "condition": "Employees must complete security training within the last 365 days",
        "required_action": "Complete annual security awareness training",
        "severity": "high", "policy_reference": "ISO 27001 A.7.2.2 / SOC2 CC1.4",
        "category": "training", "applicable_record_types": ["employee"],
        "validation_logic": {"field": "last_training_date", "operator": "date_within_days", "value": 365},
    },
    {
        "rule_id": "RULE-004", "policy_id": POLICY_ID,
        "condition": "All vendors must have a signed Data Processing Agreement",
        "required_action": "Execute and archive a signed DPA before data sharing",
        "severity": "high", "policy_reference": "GDPR Art. 28",
        "category": "vendor_management", "applicable_record_types": ["vendor"],
        "validation_logic": {"field": "contract_signed", "operator": "is_true", "value": True},
    },
    {
        "rule_id": "RULE-005", "policy_id": POLICY_ID,
        "condition": "Production servers must have automated daily backups",
        "required_action": "Configure automated backup schedules on all servers",
        "severity": "high", "policy_reference": "ISO 27001 A.12.3 / SOC2 A1.2",
        "category": "data_protection", "applicable_record_types": ["server"],
        "validation_logic": {"field": "backup_enabled", "operator": "is_true", "value": True},
    },
    {
        "rule_id": "RULE-006", "policy_id": POLICY_ID,
        "condition": "Personal data must not be retained more than 730 days",
        "required_action": "Implement 2-year data retention policy with automated review",
        "severity": "medium", "policy_reference": "GDPR Art. 5(1)(e)",
        "category": "retention", "applicable_record_types": ["data_store"],
        "validation_logic": {"field": "retention_days", "operator": "less_than", "value": 730},
    },
    {
        "rule_id": "RULE-007", "policy_id": POLICY_ID,
        "condition": "All servers must have a valid SSL/TLS certificate",
        "required_action": "Renew and install valid SSL certificates before expiry",
        "severity": "high", "policy_reference": "SOC2 CC6.7",
        "category": "encryption", "applicable_record_types": ["server"],
        "validation_logic": {"field": "ssl_certificate_valid", "operator": "is_true", "value": True},
    },
    {
        "rule_id": "RULE-008", "policy_id": POLICY_ID,
        "condition": "Sensitive data access must follow least-privilege principles",
        "required_action": "Review and restrict access rights to minimum required",
        "severity": "medium", "policy_reference": "ISO 27001 A.9.2.3",
        "category": "access_control", "applicable_record_types": ["employee", "data_store"],
        "validation_logic": {"field": "access_level", "operator": "not_equals", "value": "admin"},
    },
    {
        "rule_id": "RULE-009", "policy_id": POLICY_ID,
        "condition": "Audit logs must be reviewed at least every 90 days",
        "required_action": "Conduct and document quarterly audit log reviews",
        "severity": "medium", "policy_reference": "SOC2 CC7.2",
        "category": "audit", "applicable_record_types": ["all"],
        "validation_logic": {"field": "last_audit_date", "operator": "date_within_days", "value": 90},
    },
    {
        "rule_id": "RULE-010", "policy_id": POLICY_ID,
        "condition": "All data assets must have a classification label assigned",
        "required_action": "Assign public/internal/confidential/restricted label",
        "severity": "low", "policy_reference": "ISO 27001 A.8.2",
        "category": "data_protection", "applicable_record_types": ["data_store"],
        "validation_logic": {"field": "data_classification", "operator": "exists", "value": True},
    },
]


# ─── Company Records ──────────────────────────────────────────────────────────

def random_past_date(days_min=30, days_max=730):
    delta = random.randint(days_min, days_max)
    return (datetime.utcnow() - timedelta(days=delta)).strftime("%Y-%m-%d")


COMPANY_RECORDS = [
    # Employees — some compliant, some not
    {
        "record_id": "EMP-001", "type": "employee", "department": "Engineering",
        "data": {"name": "Alice Chen", "email": "alice@company.com", "mfa_enabled": True,
                 "last_training_date": (datetime.utcnow() - timedelta(days=45)).strftime("%Y-%m-%d"),
                 "access_level": "developer", "last_audit_date": (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "EMP-002", "type": "employee", "department": "HR",
        "data": {"name": "Bob Martinez", "email": "bob@company.com", "mfa_enabled": False,  # VIOLATION
                 "last_training_date": (datetime.utcnow() - timedelta(days=400)).strftime("%Y-%m-%d"),  # VIOLATION
                 "access_level": "manager", "last_audit_date": (datetime.utcnow() - timedelta(days=100)).strftime("%Y-%m-%d")},  # VIOLATION
    },
    {
        "record_id": "EMP-003", "type": "employee", "department": "Finance",
        "data": {"name": "Carol Davis", "email": "carol@company.com", "mfa_enabled": True,
                 "last_training_date": (datetime.utcnow() - timedelta(days=200)).strftime("%Y-%m-%d"),
                 "access_level": "admin",  # VIOLATION: admin access
                 "last_audit_date": (datetime.utcnow() - timedelta(days=20)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "EMP-004", "type": "employee", "department": "Marketing",
        "data": {"name": "David Lee", "email": "david@company.com", "mfa_enabled": True,
                 "last_training_date": (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d"),
                 "access_level": "viewer",
                 "last_audit_date": (datetime.utcnow() - timedelta(days=60)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "EMP-005", "type": "employee", "department": "Engineering",
        "data": {"name": "Emma Wilson", "email": "emma@company.com", "mfa_enabled": False,  # VIOLATION
                 "last_training_date": (datetime.utcnow() - timedelta(days=180)).strftime("%Y-%m-%d"),
                 "access_level": "developer",
                 "last_audit_date": (datetime.utcnow() - timedelta(days=50)).strftime("%Y-%m-%d")},
    },
    # Servers
    {
        "record_id": "SRV-001", "type": "server", "department": "Infrastructure",
        "data": {"hostname": "prod-web-01", "ip": "10.0.1.10",
                 "encryption_enabled": True, "backup_enabled": True, "ssl_certificate_valid": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=25)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "SRV-002", "type": "server", "department": "Infrastructure",
        "data": {"hostname": "prod-db-01", "ip": "10.0.1.20",
                 "encryption_enabled": False,  # VIOLATION
                 "backup_enabled": True, "ssl_certificate_valid": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=60)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "SRV-003", "type": "server", "department": "Dev",
        "data": {"hostname": "staging-api-01", "ip": "10.0.2.10",
                 "encryption_enabled": True, "backup_enabled": False,  # VIOLATION
                 "ssl_certificate_valid": False,  # VIOLATION
                 "last_audit_date": (datetime.utcnow() - timedelta(days=95)).strftime("%Y-%m-%d")},  # VIOLATION
    },
    {
        "record_id": "SRV-004", "type": "server", "department": "Infrastructure",
        "data": {"hostname": "backup-store-01", "ip": "10.0.3.10",
                 "encryption_enabled": True, "backup_enabled": True, "ssl_certificate_valid": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=15)).strftime("%Y-%m-%d")},
    },
    # Vendors
    {
        "record_id": "VND-001", "type": "vendor", "department": "Procurement",
        "data": {"company_name": "CloudStore Inc.", "service": "Cloud Storage",
                 "contract_signed": True, "data_types": ["personal", "financial"],
                 "last_audit_date": (datetime.utcnow() - timedelta(days=45)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "VND-002", "type": "vendor", "department": "Procurement",
        "data": {"company_name": "SendGrid Analytics", "service": "Email Marketing",
                 "contract_signed": False,  # VIOLATION: no DPA
                 "data_types": ["personal", "email"],
                 "last_audit_date": (datetime.utcnow() - timedelta(days=200)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "VND-003", "type": "vendor", "department": "HR",
        "data": {"company_name": "PeopleHR Platform", "service": "HR Management",
                 "contract_signed": True, "data_types": ["personal", "employment"],
                 "last_audit_date": (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "VND-004", "type": "vendor", "department": "Finance",
        "data": {"company_name": "PaymentPro Ltd", "service": "Payment Processing",
                 "contract_signed": False,  # VIOLATION
                 "data_types": ["financial", "personal"],
                 "last_audit_date": (datetime.utcnow() - timedelta(days=150)).strftime("%Y-%m-%d")},
    },
    # Data Stores
    {
        "record_id": "DS-001", "type": "data_store", "department": "Engineering",
        "data": {"name": "Customer Database", "location": "AWS RDS",
                 "encryption_enabled": True, "data_classification": "confidential",
                 "retention_days": 365, "personal_data": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=20)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-002", "type": "data_store", "department": "Marketing",
        "data": {"name": "Analytics Data Warehouse", "location": "GCP BigQuery",
                 "encryption_enabled": True, "data_classification": None,  # VIOLATION: no classification
                 "retention_days": 800,  # VIOLATION: > 730 days
                 "personal_data": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=100)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-003", "type": "data_store", "department": "Finance",
        "data": {"name": "Financial Records Store", "location": "On-premise",
                 "encryption_enabled": False,  # VIOLATION
                 "data_classification": "restricted",
                 "retention_days": 2555,  # VIOLATION: > 730 days (7 years legal hold — but still flagged)
                 "personal_data": False,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=85)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-004", "type": "data_store", "department": "HR",
        "data": {"name": "Employee Records", "location": "Azure Blob",
                 "encryption_enabled": True, "data_classification": "confidential",
                 "retention_days": 365, "personal_data": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=40)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-005", "type": "data_store", "department": "Engineering",
        "data": {"name": "Application Logs", "location": "Elasticsearch",
                 "encryption_enabled": True, "data_classification": "internal",
                 "retention_days": 180, "personal_data": False,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-006", "type": "data_store", "department": "Marketing",
        "data": {"name": "CRM Contact Database", "location": "Salesforce",
                 "encryption_enabled": True, "data_classification": "confidential",
                 "retention_days": 730, "personal_data": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=60)).strftime("%Y-%m-%d")},
    },
    {
        "record_id": "DS-007", "type": "data_store", "department": "Product",
        "data": {"name": "User Behaviour Analytics", "location": "Mixpanel",
                 "encryption_enabled": True, "data_classification": None,  # VIOLATION
                 "retention_days": 540, "personal_data": True,
                 "last_audit_date": (datetime.utcnow() - timedelta(days=50)).strftime("%Y-%m-%d")},
    },
]


# ─── Violations ───────────────────────────────────────────────────────────────

VIOLATIONS = [
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-001", "record_id": "EMP-002",
        "rule_condition": "All employee accounts must have MFA enabled",
        "violation_description": "Employee Bob Martinez does not have MFA enabled on their account",
        "severity": "critical", "status": "open",
        "explanation": "The employee account EMP-002 has mfa_enabled set to false, directly violating mandatory MFA policy SOC2 CC6.1.",
        "suggested_remediation": "Immediately enforce MFA enrollment for Bob Martinez via IT helpdesk.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=5)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-003", "record_id": "EMP-002",
        "rule_condition": "Employees must complete security training within 365 days",
        "violation_description": "Bob Martinez last completed security training 400 days ago — overdue",
        "severity": "high", "status": "open",
        "explanation": "Security training was completed 400 days ago, exceeding the 365-day requirement under ISO 27001 A.7.2.2.",
        "suggested_remediation": "Schedule and complete security awareness training for Bob Martinez immediately.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=35)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-001", "record_id": "EMP-005",
        "rule_condition": "All employee accounts must have MFA enabled",
        "violation_description": "Emma Wilson does not have MFA enabled",
        "severity": "critical", "status": "open",
        "explanation": "EMP-005 mfa_enabled = false, violating mandatory MFA requirement.",
        "suggested_remediation": "Enforce MFA enrollment for Emma Wilson within 24 hours.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-002", "record_id": "SRV-002",
        "rule_condition": "All data stores must be encrypted at rest",
        "violation_description": "Production database server prod-db-01 has encryption disabled",
        "severity": "critical", "status": "open",
        "explanation": "The production database server SRV-002 has encryption_enabled = false, exposing data at rest in violation of GDPR Art. 32.",
        "suggested_remediation": "Enable AES-256 encryption on prod-db-01 immediately and schedule maintenance window.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-005", "record_id": "SRV-003",
        "rule_condition": "Production servers must have automated daily backups",
        "violation_description": "Staging server staging-api-01 has no backup configured",
        "severity": "high", "status": "reviewed",
        "explanation": "SRV-003 backup_enabled = false. Without backups, data loss risk is significant.",
        "suggested_remediation": "Configure automated daily snapshots for staging-api-01 via AWS/Azure backup service.",
        "confidence_score": 0.95,
        "detected_at": (datetime.utcnow() - timedelta(days=20)).isoformat(),
        "reviewed_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-004", "record_id": "VND-002",
        "rule_condition": "All vendors must have a signed Data Processing Agreement",
        "violation_description": "SendGrid Analytics does not have a signed DPA on file",
        "severity": "high", "status": "open",
        "explanation": "SendGrid Analytics (VND-002) contract_signed = false. Sharing personal data without a DPA violates GDPR Art. 28.",
        "suggested_remediation": "Immediately contact SendGrid Analytics to execute a DPA before any further data sharing.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=8)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-006", "record_id": "DS-002",
        "rule_condition": "Personal data must not be retained more than 730 days",
        "violation_description": "Analytics Data Warehouse retains data for 800 days — exceeds 730-day limit",
        "severity": "medium", "status": "resolved",
        "explanation": "DS-002 retention_days = 800, exceeding the 730-day maximum under GDPR Art. 5(1)(e).",
        "suggested_remediation": "Update retention policy to 730 days and delete data older than 2 years.",
        "confidence_score": 0.98,
        "detected_at": (datetime.utcnow() - timedelta(days=25)).isoformat(),
        "resolved_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
    },
    {
        "violation_id": f"VIO-{uuid.uuid4().hex[:8].upper()}", "policy_id": POLICY_ID,
        "rule_id": "RULE-010", "record_id": "DS-002",
        "rule_condition": "All data assets must have a classification label assigned",
        "violation_description": "Analytics Data Warehouse has no data classification label",
        "severity": "low", "status": "open",
        "explanation": "DS-002 data_classification = null. All data assets require a classification label per ISO 27001 A.8.2.",
        "suggested_remediation": "Assign 'confidential' classification label to Analytics Data Warehouse.",
        "confidence_score": 1.0,
        "detected_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
    },
]


# ─── Seeder ───────────────────────────────────────────────────────────────────

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("🌱 PolicyPulse AI — Seeding sample data...")
    print(f"   Database: {MONGO_URL}/{DB_NAME}\n")

    # Clear existing data
    for collection in ["users", "policies", "rules", "company_records", "violations", "scan_history"]:
        await db[collection].drop()
        print(f"   🗑  Cleared: {collection}")

    # Seed users
    user_docs = []
    for u in USERS:
        doc = {
            "email": u["email"],
            "name": u["name"],
            "hashed_password": pwd_context.hash(u["password"]),
            "role": u["role"],
            "organization": u["organization"],
            "is_active": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 90)),
            "last_login": datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
        }
        user_docs.append(doc)
    await db.users.insert_many(user_docs)
    print(f"   ✅ Seeded {len(user_docs)} users")

    # Seed policy
    await db.policies.insert_one(POLICY_DOC)
    print(f"   ✅ Seeded 1 policy ({POLICY_ID})")

    # Seed rules
    await db.rules.insert_many(RULES)
    print(f"   ✅ Seeded {len(RULES)} compliance rules")

    # Seed records
    for rec in COMPANY_RECORDS:
        rec["uploaded_at"] = datetime.utcnow() - timedelta(days=random.randint(1, 60))
        rec["source"] = "seed_data"
    await db.company_records.insert_many(COMPANY_RECORDS)
    print(f"   ✅ Seeded {len(COMPANY_RECORDS)} company records")

    # Seed violations
    await db.violations.insert_many(VIOLATIONS)
    print(f"   ✅ Seeded {len(VIOLATIONS)} violations")

    # Seed a scan history entry
    scan_doc = {
        "scan_id": "SCAN-SEED0001",
        "status": "completed",
        "started_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "completed_at": (datetime.utcnow() - timedelta(hours=1, minutes=50)).isoformat(),
        "violations_found": len(VIOLATIONS),
        "records_scanned": len(COMPANY_RECORDS),
        "rules_applied": len(RULES),
    }
    await db.scan_history.insert_one(scan_doc)
    print(f"   ✅ Seeded 1 scan history entry")

    await client.close()

    print("\n" + "─" * 50)
    print("✅  Seed complete! Login credentials:")
    print("─" * 50)
    for u in USERS:
        print(f"   📧 {u['email']:<35} 🔑 {u['password']:<15} [{u['role']}]")
    print("─" * 50)
    print("\n🚀  Start the app:")
    print("   Backend:  cd backend && uvicorn main:app --reload --port 8000")
    print("   Frontend: cd frontend && npm run dev")
    print("   Open:     http://localhost:3000\n")


if __name__ == "__main__":
    asyncio.run(seed())
