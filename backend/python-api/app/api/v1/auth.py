from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from app.core.supabase_auth import get_current_user, SupabaseUser

router = APIRouter(prefix="/auth", tags=["Supabase Authentication"])

class UserProfileResponse(BaseModel):
    id: str
    email: str
    role: str
    user_metadata: dict

@router.get("/me", response_model=UserProfileResponse, summary="Get authenticated Supabase user profile")
async def get_my_profile(current_user: SupabaseUser = Depends(get_current_user)):
    """
    Returns the authenticated user details verified against Supabase Auth.
    """
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email or "unknown@kono.ai",
        role=current_user.role or "authenticated",
        user_metadata=current_user.user_metadata or {},
    )

@router.get("/health", summary="Check Supabase Auth readiness")
async def auth_health():
    return {
        "status": "ready",
        "auth_provider": "supabase",
        "description": "Supabase Auth JWT validation active"
    }
