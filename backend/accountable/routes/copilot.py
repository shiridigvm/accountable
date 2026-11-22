"""The Copilot's chat route (R58 to R73). It reads only: Confirm writes from the browser."""

from fastapi import APIRouter, Request

from accountable import copilot
from accountable.schemas import ChatIn

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


@router.post("/chat")
def chat(body: ChatIn, request: Request):
    """{reply, records, proposal}. A sync route, so the slow call runs in the thread pool."""
    messages = [m.model_dump() for m in body.messages]
    return copilot.chat(messages, request)
