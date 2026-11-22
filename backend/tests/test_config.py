"""Settings, and the guards that keep test sign-in away from real data (R26, R43, R55)."""

import pytest
from accountable import config
from accountable.config import PROJECT_ROOT
from fastapi.testclient import TestClient

POSTGRES = "postgresql://user:pw@db.example:5432/postgres"


def test_sqlite_when_database_url_is_unset(db_path):
    assert config.database_url() == f"sqlite:///{db_path}"
    assert not config.is_postgres()


@pytest.mark.parametrize(
    "given",
    [
        "postgres://user:pw@db.example:5432/postgres",
        "postgresql://user:pw@db.example:5432/postgres",
        "postgresql+psycopg://user:pw@db.example:5432/postgres",
    ],
)
def test_postgres_urls_name_the_psycopg_driver(monkeypatch, given):
    monkeypatch.setenv("DATABASE_URL", given)
    assert (
        config.database_url() == "postgresql+psycopg://user:pw@db.example:5432/postgres"
    )
    assert config.is_postgres()


def test_the_app_refuses_to_start_with_test_sign_in_on_postgres(db_path, monkeypatch):
    from accountable.main import app

    monkeypatch.setenv("DATABASE_URL", POSTGRES)
    with pytest.raises(config.UnsafeSettings), TestClient(app):
        pass


def test_postgres_without_test_sign_in_passes_the_check(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", POSTGRES)
    monkeypatch.setenv("ACCOUNTABLE_TEST_SIGN_IN", "0")
    config.check_settings()


def test_dev_and_start_listen_on_loopback_only():
    """Render's own start command, in render.yaml, is the only one on 0.0.0.0."""
    launcher = (PROJECT_ROOT / "scripts" / "run.mjs").read_text()
    assert "'--host', '127.0.0.1'" in launcher
    assert "0.0.0.0" not in launcher


def test_openrouter_defaults(monkeypatch):
    """R72: the free router by default, and OpenRouter's own address."""
    assert config.openrouter_api_key() == ""
    assert config.openrouter_model() == "openrouter/free"
    assert config.openrouter_base_url() == "https://openrouter.ai/api/v1"
    monkeypatch.setenv("OPENROUTER_MODEL", "some/model")
    monkeypatch.setenv("OPENROUTER_BASE_URL", "http://127.0.0.1:8100/api/v1/")
    assert config.openrouter_model() == "some/model"
    assert config.openrouter_base_url() == "http://127.0.0.1:8100/api/v1"


def test_run_never_passes_a_base_url_for_openrouter():
    """Only the end-to-end tests point the backend at a fake OpenRouter (R72)."""
    launcher = (PROJECT_ROOT / "scripts" / "run.mjs").read_text()
    assert "delete env.OPENROUTER_BASE_URL;" in launcher
