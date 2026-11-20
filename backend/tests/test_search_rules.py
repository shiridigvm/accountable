"""Search matching (R51 to R53)."""

from accountable.rules.search import LIMIT, fold, matches, normalize, top_matches


def _rows(*names):
    return [{"id": i, "name": name} for i, name in enumerate(names, start=1)]


def test_case_is_ignored_for_a_to_z():
    assert matches("Kestrel Freight", normalize("kEsTrEl"))
    assert fold("ABC xyz") == "abc xyz"


def test_other_letters_must_match_exactly():
    assert matches("Café Élan", normalize("Élan"))
    assert not matches("Café Élan", normalize("élan"))
    assert not matches("café élan", normalize("ÉLAN"))


def test_part_of_a_name_matches():
    assert matches("Helix Robotics quote", normalize("robot"))
    assert not matches("Helix Robotics quote", normalize("robots"))


def test_percent_and_underscore_match_only_themselves():
    assert not matches("Acme", normalize("%"))
    assert not matches("Acme", normalize("_"))
    assert matches("100% Juice", normalize("0%"))
    assert matches("snake_case", normalize("e_c"))


def test_spaces_at_either_end_are_ignored():
    assert matches("Big deal", normalize("  big  "))
    assert normalize("   ") == ""


def test_empty_text_matches_nothing():
    assert top_matches(_rows("Acme", "Beta"), "") == []
    assert top_matches(_rows("Acme", "Beta"), "   ") == []


def test_results_are_sorted_by_name_ignoring_case():
    found = top_matches(_rows("delta co", "Alpha co", "charlie co", "Bravo co"), "co")
    assert [r["name"] for r in found] == [
        "Alpha co",
        "Bravo co",
        "charlie co",
        "delta co",
    ]


def test_at_most_five_of_a_kind():
    names = [f"Deal {letter}" for letter in "GFEDCBA"]
    found = top_matches(_rows(*names), "deal")
    assert len(found) == LIMIT == 5
    assert [r["name"] for r in found] == [
        "Deal A",
        "Deal B",
        "Deal C",
        "Deal D",
        "Deal E",
    ]
