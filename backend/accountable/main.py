"""The FastAPI app. Startup creates the database and seeds it only when the file is new."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from accountable.clock import today
from accountable.config import database_path
from accountable.db import make_engine
from accountable.deals import NotFound
from accountable.routes import (
    activities,
    admin,
    contacts,
    dashboard,
    deals,
    organizations,
    pipeline,
)
from accountable.rules.delete import DeleteRefused
from accountable.schema import metadata
from accountable.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    path = database_path()
    is_new = not path.exists() or path.stat().st_size == 0
    engine = make_engine(path)
    metadata.create_all(engine)
    if is_new:
        seed_database(engine, today())
    app.state.engine = engine
    yield
    engine.dispose()


app = FastAPI(title="Accountable", lifespan=lifespan)

for router in (
    organizations.router,
    contacts.router,
    deals.router,
    activities.router,
    pipeline.router,
    dashboard.router,
    admin.router,
):
    app.include_router(router)


@app.exception_handler(DeleteRefused)
async def delete_refused(_request: Request, exc: DeleteRefused):
    return JSONResponse(
        status_code=409, content={"error": exc.message(), "linked": exc.linked}
    )


@app.exception_handler(NotFound)
async def not_found(_request: Request, exc: NotFound):
    return JSONResponse(status_code=404, content={"error": str(exc)})


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
