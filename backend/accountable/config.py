"""Runtime settings shared by the app and the scripts. All come from the environment."""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "backend" / "data" / "accountable.db"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"


def database_path() -> Path:
    return Path(os.environ.get("ACCOUNTABLE_DB", DEFAULT_DB_PATH))


def database_url() -> str:
    """DATABASE_URL when set (Postgres on Supabase), else the local SQLite file."""
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        return f"sqlite:///{database_path()}"
    # Supabase gives postgres:// or postgresql://. SQLAlchemy needs the driver named.
    for prefix in ("postgresql+psycopg://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def is_postgres() -> bool:
    return database_url().startswith("postgresql")


def reset_allowed() -> bool:
    """The reset endpoint exists only for the end-to-end tests, never on Postgres."""
    return os.environ.get("ACCOUNTABLE_ALLOW_RESET") == "1" and not is_postgres()


def test_sign_in_enabled() -> bool:
    """Test sign-in (R43). The app refuses to start with it on Postgres."""
    return os.environ.get("ACCOUNTABLE_TEST_SIGN_IN") == "1"


def supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", "").strip().rstrip("/")


def supabase_publishable_key() -> str:
    return os.environ.get("SUPABASE_PUBLISHABLE_KEY", "").strip()


def openrouter_api_key() -> str:
    """The Copilot's OpenRouter key (R72). Empty means the Copilot isn't set up."""
    return os.environ.get("OPENROUTER_API_KEY", "").strip()


def openrouter_model() -> str:
    return os.environ.get("OPENROUTER_MODEL", "").strip() or "openrouter/free"


def openrouter_base_url() -> str:
    """Only the end-to-end tests change this, to point at their fake OpenRouter."""
    url = os.environ.get("OPENROUTER_BASE_URL", "").strip().rstrip("/")
    return url or "https://openrouter.ai/api/v1"


class UnsafeSettings(Exception):
    pass


def check_settings() -> None:
    if test_sign_in_enabled() and is_postgres():
        raise UnsafeSettings(
            "ACCOUNTABLE_TEST_SIGN_IN=1 is not allowed with a Postgres DATABASE_URL."
        )
