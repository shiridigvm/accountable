"""Dashboard figures (R22, R23). Pure functions over plain dicts, so they are easy to test."""

from datetime import date, timedelta

from accountable.rules.stages import is_open

FOLLOW_UP_WINDOW_DAYS = 14
MONTHS_BACK = 12
MONTHS_AHEAD = 6


def month_window(today: date) -> list[str]:
    """Labels 'YYYY-MM' from 12 months back to 6 months ahead, including this month."""
    start = today.year * 12 + (today.month - 1) - MONTHS_BACK
    labels = []
    for offset in range(MONTHS_BACK + MONTHS_AHEAD + 1):
        year, month0 = divmod(start + offset, 12)
        labels.append(f"{year:04d}-{month0 + 1:02d}")
    return labels


def monthly_series(today: date, deals: list[dict]) -> list[dict]:
    """Won deals by actual close month. Open deals by expected close month."""
    series: dict[str, dict] = {
        label: {
            "month": label,
            "won_count": 0,
            "won_cents": 0,
            "expected_count": 0,
            "expected_cents": 0,
        }
        for label in month_window(today)
    }
    for deal in deals:
        if deal["stage"] == "Won" and deal["actual_close"]:
            label = deal["actual_close"].strftime("%Y-%m")
            if label in series:
                series[label]["won_count"] += 1
                series[label]["won_cents"] += deal["value_cents"]
        if is_open(deal["stage"]):
            label = deal["expected_close"].strftime("%Y-%m")
            if label in series:
                series[label]["expected_count"] += 1
                series[label]["expected_cents"] += deal["expected_cents"]
    return list(series.values())


def headline_stats(today: date, deals: list[dict]) -> dict:
    won = [
        d
        for d in deals
        if d["stage"] == "Won"
        and d["actual_close"]
        and d["actual_close"].year == today.year
    ]
    open_deals = [d for d in deals if is_open(d["stage"])]
    return {
        "won_year_count": len(won),
        "won_year_cents": sum(d["value_cents"] for d in won),
        "open_count": len(open_deals),
        "open_cents": sum(d["value_cents"] for d in open_deals),
        "expected_cents": sum(d["expected_cents"] for d in open_deals),
        "late_count": sum(1 for d in open_deals if d["expected_close"] < today),
    }


def follow_ups(today: date, rows: list[dict]) -> list[dict]:
    """Open follow-ups that are overdue, or due within the next 14 days."""
    horizon = today + timedelta(days=FOLLOW_UP_WINDOW_DAYS)
    result = []
    for row in rows:
        due = row["follow_up_on"]
        if due is None or row["done"]:
            continue
        if due < today:
            status = "overdue"
        elif due <= horizon:
            status = "upcoming"
        else:
            continue
        result.append(
            {
                "id": row["id"],
                "text": row["description"],
                "who": row["contact_name"] or row["deal_name"],
                "due": due,
                "status": status,
            }
        )
    return sorted(result, key=lambda f: (f["status"] != "overdue", f["due"], f["id"]))
