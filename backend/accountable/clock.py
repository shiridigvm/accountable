"""Today's date, with a test override.

ACCOUNTABLE_TODAY (YYYY-MM-DD) fixes the date so tests and sample data are
stable. Without it, the machine's local date is used.
"""

import os
from datetime import date


def today() -> date:
    fixed = os.environ.get("ACCOUNTABLE_TODAY")
    return date.fromisoformat(fixed) if fixed else date.today()
