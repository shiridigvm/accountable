"""Search rules (R51 to R53). Pure functions, no I/O.

Matching runs here, not in SQL: Postgres's lower() also folds letters such as É,
and SQLite's does not, so SQL matching would give different results on the two
databases (R52, decision 18). Accountable's data is small, so reading every name
is cheap (decision 8).
"""

LIMIT = 5
_A_TO_Z = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")


def fold(text: str) -> str:
    """Lower-case A to Z only. Other letters stay as they are."""
    return text.translate(_A_TO_Z)


def normalize(query: str) -> str:
    return fold(query.strip())


def matches(name: str, normalized_query: str) -> bool:
    """The text is matched literally, so % and _ mean themselves."""
    return bool(normalized_query) and normalized_query in fold(name)


def top_matches(rows: list[dict], query: str) -> list[dict]:
    """Rows whose name contains the query, sorted by name, at most LIMIT."""
    needle = normalize(query)
    found = [row for row in rows if matches(row["name"], needle)]
    found.sort(key=lambda row: (fold(row["name"]), row["name"], row["id"]))
    return found[:LIMIT]
