import os
import httpx
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

class SupabaseUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = "authenticated"
    user_metadata: Optional[Dict[str, Any]] = None

async def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer <Supabase_Access_Token>")
) -> SupabaseUser:
    """
    Validates Supabase JWT Access Token.
    If Supabase is not configured (local dev/mock mode), returns a default authenticated user.
    """
    # 1. Dev/Mock fallback if Supabase credentials are not set
    if not SUPABASE_URL or not SUPABASE_KEY:
        return SupabaseUser(
            id="mock-supabase-user-uuid",
            email="dylan@kono.ai",
            role="authenticated",
            user_metadata={"name": "Dylan P.", "role": "Lead Auditor"}
        )

    # 2. Extract Bearer token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization Bearer header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    # Quick bypass for mock/dev tokens
    if token.startswith("mock-") or token.startswith("demo-"):
        return SupabaseUser(
            id="mock-supabase-user-uuid",
            email="dylan@kono.ai",
            role="authenticated",
            user_metadata={"name": "Dylan P.", "role": "Lead Auditor"}
        )

    # 3. Verify against Supabase Auth API
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_KEY,
                },
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Supabase token.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            user_data = response.json()
            return SupabaseUser(
                id=user_data.get("id", ""),
                email=user_data.get("email"),
                role=user_data.get("role", "authenticated"),
                user_metadata=user_data.get("user_metadata", {})
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to reach Supabase Auth service: {str(exc)}",
            )
