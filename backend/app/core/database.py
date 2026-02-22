"""
PolicyPulse AI – MongoDB Connection
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

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


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("[X] Disconnected from MongoDB")


def get_database():
    return db


async def seed_sample_data():
    """Seed sample company records for demo purposes."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()

    records = [
        {
            "record_id": "EMP-001",
            "type": "employee",
            "department": "Engineering",
            "source": "seed",
            "uploaded_at": now,
            "data": {
                "name": "Alice Johnson",
                "email": "alice@company.com",
                "role": "admin",
                "hire_date": "2025-06-15",
                "last_training": "2025-12-01",
            },
        },
        {
            "record_id": "EMP-002",
            "type": "employee",
            "department": "Marketing",
            "source": "seed",
            "uploaded_at": now,
            "data": {
                "name": "Bob Smith",
                "email": "bob@company.com",
                "role": "user",
                "hire_date": "2024-01-10",
                "last_training": "2025-03-15",
            },
        },
        {
            "record_id": "EMP-003",
            "type": "employee",
            "department": "Finance",
            "source": "seed",
            "uploaded_at": now,
            "data": {
                "name": "Carol Davis",
                "email": "carol@company.com",
                "role": "user",
                "hire_date": "2025-11-20",
                "last_training": "2024-08-10",
            },
        },
        {
            "record_id": "SRV-001",
            "type": "server",
            "department": "Infrastructure",
            "source": "seed",
            "uploaded_at": now,
            "data": {
                "name": "prod-db-01",
                "last_patched": "2025-09-01",
                "backup_schedule": "daily",
            },
        },
        {
            "record_id": "SRV-002",
            "type": "server",
            "department": "Infrastructure",
            "source": "seed",
            "uploaded_at": now,
            "data": {
                "name": "staging-web-02",
                "last_patched": "2025-07-15",
                "backup_schedule": "weekly",
            },
        },
    ]

    await db.company_records.insert_many(records)
    print(f"[OK] Seeded {len(records)} sample records")
