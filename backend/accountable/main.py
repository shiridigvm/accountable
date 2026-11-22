"""The FastAPI app.

Startup migrates the database and seeds it only when it had no tables. Every
router except the sign-in routes needs a signed-in person (R37, R40). When the
frontend has been built, the same app serves it (R56, R57).
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from accountable.auth import NotSignedIn, SignInServiceDown, require_user
from accountable.clock import today
from accountable.config import FRONTEND_DIST, check_settings, database_url
from accountable.copilot import CopilotBusy, CopilotFailed, CopilotNotSetUp
from accountable.db import make_engine
from accountable.deals import NotFound
from accountable.migrate import run_migrations
from accountable.routes import (
    activities,
    admin,
    auth,
    contacts,
    copilot,
    dashboard,
    deals,
    organizations,
    pipeline,
    search,
)
from accountable.rules.delete import DeleteRefused
from accountable.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_settings()
    engine = make_engine(database_url())
    if run_migrations(engine):
        seed_database(engine, today())
    app.state.engine = engine
    yield
    engine.dispose()


app = FastAPI(title="Accountable", lifespan=lifespan)

app.include_router(auth.router)
for router in (
    organizations.router,
    contacts.router,
    deals.router,
    activities.router,
    pipeline.router,
    dashboard.router,
    search.router,
    copilot.router,
    admin.router,
):
    app.include_router(router, dependencies=[Depends(require_user)])


def add_frontend(target: FastAPI, dist: Path) -> None:
    """Serve the built frontend. Any path outside /api gets index.html, for the router."""
    if not (dist / "index.html").is_file():
        return
    root = dist.resolve()
    if (dist / "assets").is_dir():
        target.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @target.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        if path == "api" or path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not found."})
        file = (root / path).resolve()
        if path and file.is_file() and file.is_relative_to(root):
            return FileResponse(file)
        return FileResponse(root / "index.html")


@app.exception_handler(NotSignedIn)
async def not_signed_in(_request: Request, _exc: NotSignedIn):
    return JSONResponse(status_code=401, content={"error": "Sign in to continue."})


@app.exception_handler(SignInServiceDown)
async def sign_in_service_down(_request: Request, _exc: SignInServiceDown):
    return JSONResponse(
        status_code=503, content={"error": "Can't reach the sign-in service."}
    )


@app.exception_handler(DeleteRefused)
async def delete_refused(_request: Request, exc: DeleteRefused):
    return JSONResponse(
        status_code=409, content={"error": exc.message(), "linked": exc.linked}
    )


@app.exception_handler(NotFound)
async def not_found(_request: Request, exc: NotFound):
    return JSONResponse(status_code=404, content={"error": str(exc)})


@app.exception_handler(CopilotNotSetUp)
async def copilot_not_set_up(_request: Request, _exc: CopilotNotSetUp):
    return JSONResponse(
        status_code=503,
        content={
            "error": "The Copilot isn't set up yet. Ask whoever runs Accountable "
            "to add an OpenRouter key."
        },
    )


@app.exception_handler(CopilotBusy)
async def copilot_busy(_request: Request, _exc: CopilotBusy):
    return JSONResponse(
        status_code=429,
        content={"error": "The AI service is busy. Try again in a minute."},
    )


@app.exception_handler(CopilotFailed)
async def copilot_failed(_request: Request, _exc: CopilotFailed):
    return JSONResponse(
        status_code=502,
        content={"error": "The Copilot couldn't get an answer. Try again."},
    )


@app.exception_handler(RequestValidationError)
async def invalid_input(_request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(part) for part in first.get("loc", [])[1:]) or "input"
    return JSONResponse(
        status_code=422,
        content={"error": f"Check {field}: {first.get('msg', 'not valid')}."},
    )


@app.exception_handler(IntegrityError)
async def integrity(_request: Request, _exc: IntegrityError):
    return JSONResponse(
        status_code=422,
        content={"error": "A linked record does not exist, or a value is not allowed."},
    )


# Registered last, so the API routes match first.
add_frontend(app, FRONTEND_DIST)
