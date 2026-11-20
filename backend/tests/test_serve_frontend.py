"""The built frontend served by FastAPI (R56, R57)."""

from accountable.main import add_frontend
from fastapi import FastAPI
from fastapi.testclient import TestClient


def _app(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<div id=root></div>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "favicon.svg").write_text("<svg/>")
    app = FastAPI()
    add_frontend(app, tmp_path)
    return TestClient(app)


def test_app_paths_get_index_html(tmp_path):
    client = _app(tmp_path)
    for path in ("/", "/dashboard", "/deals/3"):
        reply = client.get(path)
        assert reply.status_code == 200
        assert "id=root" in reply.text


def test_built_files_are_served(tmp_path):
    client = _app(tmp_path)
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/favicon.svg").text == "<svg/>"


def test_unknown_api_paths_stay_json_404(tmp_path):
    reply = _app(tmp_path).get("/api/unknown")
    assert reply.status_code == 404
    assert reply.json() == {"error": "Not found."}


def test_files_outside_the_build_are_not_served(tmp_path):
    (tmp_path.parent / "secret.txt").write_text("no")
    reply = _app(tmp_path).get("/..%2Fsecret.txt")
    assert "id=root" in reply.text


def test_nothing_is_served_without_a_build(tmp_path):
    app = FastAPI()
    add_frontend(app, tmp_path)
    assert TestClient(app).get("/dashboard").status_code == 404
