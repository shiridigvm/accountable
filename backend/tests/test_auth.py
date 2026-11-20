"""Sign-in on the API (R37, R40, R41, R43). Supabase is always faked here."""

import io
import json
import urllib.error
from email.message import Message

import pytest
from accountable import auth
from accountable.main import app

OPEN_ROUTES = {"/api/auth/config", "/api/auth/test-sign-in"}


def _api_routes():
    # The OpenAPI schema lists every route, including those in included routers.
    for path, operations in app.openapi()["paths"].items():
        if path.startswith("/api"):
            for method in operations:
                yield method.upper(), path


def test_every_api_route_needs_a_token(anon_client):
    checked = 0
    for method, path in _api_routes():
        if path in OPEN_ROUTES:
            continue
        reply = anon_client.request(method, path.replace("{", "").replace("}", ""))
        # Path parameters like {org_id} become text, so a route that skipped the
        # check would answer 422. Only 401 shows the check ran first.
        assert reply.status_code == 401, (method, path, reply.status_code)
        assert reply.json() == {"error": "Sign in to continue."}
        checked += 1
    assert checked > 20


def test_a_malformed_or_unknown_token_is_refused(anon_client):
    for header in ("Bearer", "Basic abc", "Bearer test-not-issued", "test-x"):
        reply = anon_client.get("/api/deals", headers={"Authorization": header})
        assert reply.status_code == 401, header


def test_test_tokens_are_refused_while_test_sign_in_is_off(client, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TEST_SIGN_IN", "0")
    assert client.get("/api/deals").status_code == 401


def test_test_sign_in_is_404_while_off(anon_client, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_TEST_SIGN_IN", "0")
    reply = anon_client.post("/api/auth/test-sign-in", json={"email": "a@example.com"})
    assert reply.status_code == 404


def test_test_sign_in_needs_an_email(anon_client):
    reply = anon_client.post("/api/auth/test-sign-in", json={"email": "no-at-sign"})
    assert reply.status_code == 422


def test_me_returns_the_signed_in_email(client):
    assert client.get("/api/me").json() == {"email": "tester@example.com"}


def test_config_gives_only_the_url_key_and_test_flag(anon_client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co/")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:secret@db.example/postgres")
    reply = anon_client.get("/api/auth/config").json()
    assert reply == {
        "supabase_url": "https://project.supabase.co",
        "supabase_publishable_key": "sb_publishable_x",
        "test_sign_in": True,
    }


def test_a_supabase_token_is_checked_once_then_cached(anon_client, monkeypatch):
    calls = []

    def fake(token):
        calls.append(token)
        return "ana@example.com"

    monkeypatch.setattr(auth, "fetch_supabase_email", fake)
    headers = {"Authorization": "Bearer supabase-token"}
    assert anon_client.get("/api/me", headers=headers).json()["email"] == (
        "ana@example.com"
    )
    anon_client.get("/api/deals", headers=headers)
    assert calls == ["supabase-token"]


def test_a_rejected_supabase_token_gets_401(anon_client, monkeypatch):
    def fake(_token):
        raise auth.NotSignedIn()

    monkeypatch.setattr(auth, "fetch_supabase_email", fake)
    reply = anon_client.get("/api/me", headers={"Authorization": "Bearer bad"})
    assert reply.status_code == 401


def test_supabase_unreachable_gets_503(anon_client, monkeypatch):
    def fake(_token):
        raise auth.SignInServiceDown()

    monkeypatch.setattr(auth, "fetch_supabase_email", fake)
    reply = anon_client.get("/api/me", headers={"Authorization": "Bearer any"})
    assert reply.status_code == 503
    assert reply.json() == {"error": "Can't reach the sign-in service."}


@pytest.fixture
def supabase_settings(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x")


def test_fetch_sends_the_token_and_key_and_reads_the_email(
    supabase_settings, monkeypatch
):
    seen = {}

    def fake_urlopen(request, timeout):
        seen["url"] = request.full_url
        seen["headers"] = dict(request.header_items())
        return io.BytesIO(json.dumps({"email": "ana@example.com"}).encode())

    monkeypatch.setattr(auth.urllib.request, "urlopen", fake_urlopen)
    assert auth.fetch_supabase_email("tok") == "ana@example.com"
    assert seen["url"] == "https://project.supabase.co/auth/v1/user"
    assert seen["headers"]["Apikey"] == "sb_publishable_x"
    assert seen["headers"]["Authorization"] == "Bearer tok"


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (urllib.error.HTTPError("u", 401, "no", Message(), None), auth.NotSignedIn),
        (urllib.error.HTTPError("u", 403, "no", Message(), None), auth.NotSignedIn),
        (
            urllib.error.HTTPError("u", 500, "down", Message(), None),
            auth.SignInServiceDown,
        ),
        (urllib.error.URLError("no route"), auth.SignInServiceDown),
        (TimeoutError(), auth.SignInServiceDown),
    ],
)
def test_fetch_maps_supabase_failures(supabase_settings, monkeypatch, error, expected):
    def fake_urlopen(_request, timeout):
        raise error

    monkeypatch.setattr(auth.urllib.request, "urlopen", fake_urlopen)
    with pytest.raises(expected):
        auth.fetch_supabase_email("tok")


def test_fetch_without_settings_is_not_signed_in():
    with pytest.raises(auth.NotSignedIn):
        auth.fetch_supabase_email("tok")
