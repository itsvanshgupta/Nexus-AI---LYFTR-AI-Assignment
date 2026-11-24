"""
Domain models and entity definitions for Nexus AI.
Database tables are managed via SQLite in app/database.py
and API request/response models are defined in app/schemas.py.
"""
from app.schemas import (
    HealthResponse,
    ChatRequest,
    ChatResponse,
    ChatMetadata,
    MessageItem,
    SessionMessagesResponse
)

__all__ = [
    "HealthResponse",
    "ChatRequest",
    "ChatResponse",
    "ChatMetadata",
    "MessageItem",
    "SessionMessagesResponse"
]
