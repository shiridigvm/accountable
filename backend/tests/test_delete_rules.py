import pytest
from accountable.rules.delete import DeleteRefused, check_deletable


def test_record_without_links_can_be_deleted():
    check_deletable("organization", {"contacts": 0, "deals": 0})


def test_linked_records_refuse_the_delete_and_say_what_is_linked():
    with pytest.raises(DeleteRefused) as info:
        check_deletable("organization", {"contacts": 3, "deals": 2})
    assert info.value.linked == {"contacts": 3, "deals": 2}
    assert "3 contacts, 2 deals" in info.value.message()


def test_single_records_use_singular_words():
    with pytest.raises(DeleteRefused) as info:
        check_deletable("deal", {"activities": 1})
    assert "It has 1 activity." in info.value.message()


def test_only_non_zero_links_are_listed():
    with pytest.raises(DeleteRefused) as info:
        check_deletable("deal", {"activities": 1})
    assert info.value.linked == {"activities": 1}
