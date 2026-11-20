"""Who is signed in (R37, R40, R43).

Every request carries a bearer token. A Supabase token is checked by asking
Supabase's Auth server, which works whichever kind of signing key the project
uses, and good answers are cached for a few minutes. A token starting with
"test-" comes from test sign-in, lives only in this process, and is never sent
to Supabase.
"""

import hashlib
import json
import secrets
import time
import urllib.error
import urllib.request

from fastapi import Request

from accountable.config import (
    supabase_publishable_key,
    supabase_url,
    test_sign_in_enabled,
)

TEST_PREFIX = "test-"
CACHE_SECONDS = 300
SUPABASE_TIMEOUT_SECONDS = 5


class NotSignedIn(Exception):
    pass


class SignInServiceDown(Exception):
    pass


_test_tokens: dict[str, str] = {}
# sha256 of the token -> (email, expiry time). Hashed so raw tokens are not kept.
_cache: dict[str, tuple[str, float]] = {}


def issue_test_token(email: str) -> str:
    token = TEST_PREFIX + secrets.token_urlsafe(32)
    _test_tokens[token] = email
    return token


def clear() -> None:
    """Forget every test token and cached answer. Used by the tests."""
    _test_tokens.clear()
    _cache.clear()


def fetch_supabase_email(token: str) -> str:
    """Ask Supabase who owns the token. The tests replace this function."""
    url, key = supabase_url(), supabase_publishable_key()
    if not url or not key:
        raise NotSignedIn()
    request = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"apikey": key, "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=SUPABASE_TIMEOUT_SECONDS) as reply:
            email = json.load(reply).get("email")
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            raise NotSignedIn() from error
        raise SignInServiceDown() from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise SignInServiceDown() from error
    if not email:
        raise NotSignedIn()
    return email


def _supabase_email(token: str) -> str:
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.monotonic()
    cached = _cache.get(key)
    if cached and cached[1] > now:
        return cached[0]
    email = fetch_supabase_email(token)
    for stale in [k for k, (_, expires) in _cache.items() if expires <= now]:
        del _cache[stale]
    _cache[key] = (email, now + CACHE_SECONDS)
    return email


def email_for_token(token: str) -> str:
    if token.startswith(TEST_PREFIX):
        email = _test_tokens.get(token) if test_sign_in_enabled() else None
        if email is None:
            raise NotSignedIn()
        return email
    return _supabase_email(token)


def require_user(request: Request) -> str:
    """FastAPI dependency: the signed-in person's email, from the token only."""
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise NotSignedIn()
    email = email_for_token(token.strip())
    request.state.user_email = email
    return email


def user_of(request: Request) -> str:
    return request.state.user_email
