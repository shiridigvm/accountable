"""GET /api/search (R51 to R53)."""


def test_finds_each_kind_by_part_of_a_name_in_any_case(client):
    client.post("/api/admin/reset")
    reply = client.get("/api/search", params={"q": "KESTREL"}).json()
    assert [o["name"] for o in reply["organizations"]] == ["Kestrel Freight"]
    assert reply["deals"]
    assert all("kestrel" in d["name"].lower() for d in reply["deals"])

    contacts = client.get("/api/search", params={"q": "priya"}).json()["contacts"]
    assert contacts == [
        {
            "id": contacts[0]["id"],
            "name": "Priya Nair",
            "organization_name": "Kestrel Freight",
        }
    ]


def test_a_contact_without_an_organization_has_none(client):
    client.post("/api/contacts", json={"name": "Loner", "status": "lead"})
    contacts = client.get("/api/search", params={"q": "lone"}).json()["contacts"]
    assert contacts[0]["organization_name"] is None


def test_empty_text_returns_empty_groups(client):
    client.post("/api/admin/reset")
    for q in ("", "   "):
        assert client.get("/api/search", params={"q": q}).json() == {
            "organizations": [],
            "contacts": [],
            "deals": [],
        }


def test_wildcards_are_literal(client):
    client.post("/api/admin/reset")
    reply = client.get("/api/search", params={"q": "%"}).json()
    assert reply == {"organizations": [], "contacts": [], "deals": []}


def test_search_needs_a_token(anon_client):
    assert anon_client.get("/api/search", params={"q": "a"}).status_code == 401
