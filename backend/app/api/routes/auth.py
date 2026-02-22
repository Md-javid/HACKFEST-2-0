"""
PolicyPulse AI – Authentication & User Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.core.database import get_database
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_admin_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ──────────── Request / Response Models ────────────

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    organization: Optional[str] = "PolicyPulse Demo"
    role: Optional[str] = "viewer"  # viewer | analyst | admin


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    organization: str
    role: str
    created_at: str
    last_login: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ──────────── Register ────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    db = get_database()

    # Check duplicate email
    existing = await db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": hash_password(req.password),
        "organization": req.organization,
        "role": req.role if req.role in ("viewer", "analyst", "admin") else "viewer",
        "created_at": now,
        "last_login": now,
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(data={"sub": user_doc["email"], "role": user_doc["role"]})

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            name=user_doc["name"],
            email=user_doc["email"],
            organization=user_doc["organization"],
            role=user_doc["role"],
            created_at=now,
            last_login=now,
        ),
    )


# ──────────── Login ────────────

@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    db = get_database()
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Update last_login
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now}})

    token = create_access_token(data={"sub": user["email"], "role": user.get("role", "viewer")})

    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            organization=user.get("organization", ""),
            role=user.get("role", "viewer"),
            created_at=user.get("created_at", ""),
            last_login=now,
        ),
    )


# ──────────── Get Current User (me) ────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        name=current_user["name"],
        email=current_user["email"],
        organization=current_user.get("organization", ""),
        role=current_user.get("role", "viewer"),
        created_at=current_user.get("created_at", ""),
        last_login=current_user.get("last_login", None),
    )


# ──────────── List All Users (admin only) ────────────

@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_admin_user)):
    db = get_database()
    users = []
    async for u in db.users.find().sort("created_at", -1):
        users.append(
            UserResponse(
                id=str(u["_id"]),
                name=u["name"],
                email=u["email"],
                organization=u.get("organization", ""),
                role=u.get("role", "viewer"),
                created_at=u.get("created_at", ""),
                last_login=u.get("last_login", None),
            )
        )
    return users


# ──────────── Update User Role (admin only) ────────────

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: dict = Depends(get_admin_user),
):
    if role not in ("viewer", "analyst", "admin"):
        raise HTTPException(status_code=400, detail="Role must be viewer, analyst, or admin")
    db = get_database()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {role}"}


# ──────────── Delete User (admin only) ────────────

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_admin_user),
):
    if current_user["_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db = get_database()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
