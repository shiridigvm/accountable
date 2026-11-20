"""Sign-in routes. The first two need no token, because signing in needs them (R41, R43)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from accountable.auth import issue_test_token, require_user
from accountable.config import (
    supabase_publishable_key,
    supabase_url,
    test_sign_in_enabled,
)
from accountable.deals import NotFound

router = APIRouter(prefix="/api", tags=["auth"])


class TestSignInIn(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+$")


@router.get("/auth/config")
def auth_config():
    return {
        "supabase_url": supabase_url(),
        "supabase_publishable_key": supabase_publishable_key(),
        "test_sign_in": test_sign_in_enabled(),
    }


@router.post("/auth/test-sign-in")
def test_sign_in(body: TestSignInIn):
    if not test_sign_in_enabled():
        raise NotFound("Not found.")
    return {"access_token": issue_test_token(body.email), "email": body.email}


@router.get("/me")
def me(email: str = Depends(require_user)):
    return {"email": email}
