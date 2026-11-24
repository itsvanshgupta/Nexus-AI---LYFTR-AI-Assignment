from fastapi import APIRouter, HTTPException
from app.database import session_exists, get_session_messages
from app.schemas import SessionMessagesResponse, MessageItem

router = APIRouter()


@router.get("/sessions/{session_id}/messages", response_model=SessionMessagesResponse)
async def get_session_history(session_id: str):
    """
    GET /sessions/{session_id}/messages
    Returns chronological history of stored user and assistant messages.
    Does not include system prompt.
    Returns 404 if session does not exist.
    """
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="session not found")

    raw_messages = get_session_messages(session_id)
    items = []
    for msg in raw_messages:
        items.append(MessageItem(
            role=msg["role"],
            content=msg["content"],
            metadata=msg.get("metadata")
        ))

    return SessionMessagesResponse(
        session_id=session_id,
        messages=items
    )
