"""Runtime settings shared by the app and the scripts."""

import os
from pathlib import Path

# The app only listens on loopback, so other machines cannot reach the data.
HOST = "127.0.0.1"
PORT = 8000

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "backend" / "data" / "accountable.db"


def database_path() -> Path:
    return Path(os.environ.get("ACCOUNTABLE_DB", DEFAULT_DB_PATH))


def reset_allowed() -> bool:
    """The reset endpoint exists only for the end-to-end tests."""
    return os.environ.get("ACCOUNTABLE_ALLOW_RESET") == "1"
