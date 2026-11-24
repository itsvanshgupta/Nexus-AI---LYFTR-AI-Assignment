import os
import json
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.config import settings


def get_db_path() -> str:
    path = settings.sqlite_db_path
    dir_name = os.path.dirname(path)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name, exist_ok=True)
    return path


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path(), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize SQLite database with required schema and indexes."""
    db_path = get_db_path()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);")
        conn.commit()


def check_db_health() -> bool:
    """Verify database reachability."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1;")
            result = cursor.fetchone()
            return result is not None and result[0] == 1
    except Exception:
        return False


def session_exists(session_id: str) -> bool:
    """Check if any message exists for the given session_id."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM messages WHERE session_id = ? LIMIT 1;", (session_id,))
        return cursor.fetchone() is not None


def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    """Retrieve session history ordered chronologically."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT role, content, metadata, created_at
            FROM messages
            WHERE session_id = ?
            ORDER BY id ASC;
            """,
            (session_id,)
        )
        rows = cursor.fetchall()
        messages = []
        for row in rows:
            msg = {
                "role": row["role"],
                "content": row["content"]
            }
            if row["metadata"]:
                try:
                    msg["metadata"] = json.loads(row["metadata"])
                except Exception:
                    msg["metadata"] = row["metadata"]
            messages.append(msg)
        return messages


def save_chat_turn(
    session_id: str,
    user_content: str,
    assistant_content: str,
    assistant_metadata: Dict[str, Any]
) -> None:
    """Atomically save user message and assistant reply to SQLite."""
    now = datetime.now(timezone.utc).isoformat()
    metadata_json = json.dumps(assistant_metadata)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO messages (session_id, role, content, metadata, created_at)
            VALUES (?, 'user', ?, NULL, ?);
            """,
            (session_id, user_content, now)
        )
        cursor.execute(
            """
            INSERT INTO messages (session_id, role, content, metadata, created_at)
            VALUES (?, 'assistant', ?, ?, ?);
            """,
            (session_id, assistant_content, metadata_json, now)
        )
        conn.commit()
