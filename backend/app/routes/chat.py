from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from app.config import settings
from app.database import get_session_messages, save_chat_turn
from app.schemas import ChatRequest, ChatResponse
from app.services.llm_service import execute_chat

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def post_chat(
    req: ChatRequest,
    x_simulate_failure: Optional[str] = Header(None, alias="X-Simulate-Failure")
):
    """
    POST /chat
    Handles chat requests with multi-turn memory, response caching,
    key failover, and optional failure simulation.
    """
    # 1. Fetch previous session history from SQLite (oldest first)
    stored_history = get_session_messages(req.session_id)

    # 2. Build full message array for LLM context
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})

    for msg in stored_history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": req.message})

    # 3. Execute inference with caching & fallback logic
    reply, metadata = await execute_chat(
        model=settings.LLM_MODEL,
        messages=messages,
        simulate_header=x_simulate_failure
    )

    # 4. Save turn to database only on successful completion
    save_chat_turn(
        session_id=req.session_id,
        user_content=req.message,
        assistant_content=reply,
        assistant_metadata=metadata.model_dump()
    )

    return ChatResponse(
        session_id=req.session_id,
        reply=reply,
        metadata=metadata
    )
