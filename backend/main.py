"""
PolicyPulse AI - Autonomous Data Compliance Agent
Main FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.services.scheduler import start_scheduler, stop_scheduler
from app.api.routes import auth, records, policies, violations, dashboard, ai


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup
    print("[>>] Starting PolicyPulse AI backend...")
    await connect_to_mongo()
    start_scheduler()
    print("[OK] PolicyPulse AI is ready!")
    yield
    # Shutdown
    stop_scheduler()
    await close_mongo_connection()
    print("[--] PolicyPulse AI shut down.")


app = FastAPI(
    title="PolicyPulse AI",
    description="Autonomous Data Compliance Agent - Scan policies, detect violations, enforce rules",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(policies.router, prefix="/api")
app.include_router(violations.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": "PolicyPulse AI",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }
