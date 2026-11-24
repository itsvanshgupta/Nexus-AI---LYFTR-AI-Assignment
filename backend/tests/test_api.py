import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from litellm.utils import ModelResponse, Choices, Message, Usage
import litellm

# Point database to temporary test SQLite
os.environ["DATABASE_URL"] = "sqlite:///./data/test_app.db"
os.environ["LLM_API_KEYS"] = "mock_key_1,mock_key_2"
os.environ["ENABLE_FAILURE_SIMULATION"] = "true"

from app.main import app
from app.database import init_db, get_connection
from app.services.llm_service import init_litellm_cache


def create_mock_completion_response(content: str = "Test reply", prompt_tokens: int = 15, completion_tokens: int = 5):
    return ModelResponse(
        id="mock-resp-id",
        choices=[Choices(message=Message(content=content, role="assistant"))],
        usage=Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens
        )
    )


@pytest.fixture(autouse=True)
def setup_teardown():
    # Fresh database and cache for each test
    init_db()
    init_litellm_cache()
    if litellm.cache is not None:
        try:
            # Clear in-memory cache
            litellm.cache.cache.flush_cache()
        except Exception:
            pass

    with get_connection() as conn:
        conn.execute("DELETE FROM messages;")
        conn.commit()

    yield

    with get_connection() as conn:
        conn.execute("DELETE FROM messages;")
        conn.commit()


client = TestClient(app)


# 1. Health endpoint test
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["keys_configured"] >= 2
    assert data["cache_enabled"] is True


# 2. Successful chat request
@patch("app.services.llm_service.litellm.completion")
def test_successful_chat_request(mock_completion):
    mock_completion.return_value = create_mock_completion_response(
        content="The capital of France is Paris.",
        prompt_tokens=20,
        completion_tokens=8
    )

    response = client.post("/chat", json={
        "session_id": "s-test-1",
        "message": "What is the capital of France?"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "s-test-1"
    assert data["reply"] == "The capital of France is Paris."
    meta = data["metadata"]
    assert meta["resolution_source"] == "LIVE_INFERENCE"
    assert meta["input_tokens"] == 20
    assert meta["output_tokens"] == 8
    assert meta["key_id"] == "key_1"
    assert meta["fallback_attempts"] == 0
    assert isinstance(meta["latency_ms"], int)


# 3. Multi-turn conversation memory
@patch("app.services.llm_service.litellm.completion")
def test_multi_turn_conversation_memory(mock_completion):
    mock_completion.side_effect = [
        create_mock_completion_response(content="Nice to meet you, Vansh."),
        create_mock_completion_response(content="Your name is Vansh.")
    ]

    # Turn 1
    res1 = client.post("/chat", json={
        "session_id": "s-multi-1",
        "message": "My name is Vansh."
    })
    assert res1.status_code == 200
    assert res1.json()["reply"] == "Nice to meet you, Vansh."

    # Turn 2: Verify that history was sent to completion
    res2 = client.post("/chat", json={
        "session_id": "s-multi-1",
        "message": "What is my name?"
    })
    assert res2.status_code == 200
    assert res2.json()["reply"] == "Your name is Vansh."

    # Inspect the call args of the second completion
    assert mock_completion.call_count == 2
    second_call_messages = mock_completion.call_args_list[1].kwargs["messages"]
    # Expect: turn 1 user, turn 1 assistant, turn 2 user
    assert len(second_call_messages) == 3
    assert second_call_messages[0]["content"] == "My name is Vansh."
    assert second_call_messages[1]["content"] == "Nice to meet you, Vansh."
    assert second_call_messages[2]["content"] == "What is my name?"


# 4. Separate session histories
@patch("app.services.llm_service.litellm.completion")
def test_separate_session_histories(mock_completion):
    mock_completion.side_effect = [
        create_mock_completion_response(content="Hello Alice"),
        create_mock_completion_response(content="Hello Bob")
    ]

    client.post("/chat", json={"session_id": "session-A", "message": "I am Alice"})
    client.post("/chat", json={"session_id": "session-B", "message": "I am Bob"})

    hist_a = client.get("/sessions/session-A/messages").json()
    hist_b = client.get("/sessions/session-B/messages").json()

    assert len(hist_a["messages"]) == 2
    assert hist_a["messages"][0]["content"] == "I am Alice"
    assert hist_a["messages"][1]["content"] == "Hello Alice"

    assert len(hist_b["messages"]) == 2
    assert hist_b["messages"][0]["content"] == "I am Bob"
    assert hist_b["messages"][1]["content"] == "Hello Bob"


# 5. SQLite persistence check
@patch("app.services.llm_service.litellm.completion")
def test_sqlite_persistence(mock_completion):
    mock_completion.return_value = create_mock_completion_response(content="Persisted message")

    client.post("/chat", json={"session_id": "s-persist", "message": "Test persistence"})

    with get_connection() as conn:
        rows = conn.execute("SELECT role, content FROM messages WHERE session_id = 's-persist' ORDER BY id ASC;").fetchall()
        assert len(rows) == 2
        assert rows[0]["role"] == "user"
        assert rows[0]["content"] == "Test persistence"
        assert rows[1]["role"] == "assistant"
        assert rows[1]["content"] == "Persisted message"


# 6. Cache hit on repeated identical requests in new sessions
@patch("app.services.llm_service.litellm.completion")
def test_cache_hit_on_identical_requests(mock_completion):
    mock_completion.return_value = create_mock_completion_response(
        content="Identical answer",
        prompt_tokens=12,
        completion_tokens=4
    )

    # First request: Live inference
    res1 = client.post("/chat", json={"session_id": "s-cache-1", "message": "What is 2+2?"})
    assert res1.status_code == 200
    assert res1.json()["metadata"]["resolution_source"] == "LIVE_INFERENCE"
    assert res1.json()["metadata"]["key_id"] == "key_1"
    assert mock_completion.call_count == 1

    # Second request with new session but identical message: Cache hit
    res2 = client.post("/chat", json={"session_id": "s-cache-2", "message": "What is 2+2?"})
    assert res2.status_code == 200
    assert res2.json()["reply"] == "Identical answer"
    assert res2.json()["metadata"]["resolution_source"] == "LLM_CACHE"
    assert res2.json()["metadata"]["key_id"] is None
    assert res2.json()["metadata"]["fallback_attempts"] == 0
    assert res2.json()["metadata"]["input_tokens"] == 12
    assert res2.json()["metadata"]["output_tokens"] == 4
    # Ensure completion was NOT called a second time
    assert mock_completion.call_count == 1


# 7. Different message does not incorrectly hit cache
@patch("app.services.llm_service.litellm.completion")
def test_different_message_does_not_hit_cache(mock_completion):
    mock_completion.side_effect = [
        create_mock_completion_response(content="First answer"),
        create_mock_completion_response(content="Second answer")
    ]

    res1 = client.post("/chat", json={"session_id": "s-diff-1", "message": "Question 1"})
    assert res1.json()["metadata"]["resolution_source"] == "LIVE_INFERENCE"

    res2 = client.post("/chat", json={"session_id": "s-diff-2", "message": "Question 2"})
    assert res2.json()["metadata"]["resolution_source"] == "LIVE_INFERENCE"
    assert res2.json()["reply"] == "Second answer"
    assert mock_completion.call_count == 2


# 8. API key failover (key_1 fails, key_2 succeeds)
@patch("app.services.llm_service.litellm.completion")
def test_api_key_failover(mock_completion):
    # First call fails (e.g. rate limit / 429), second call succeeds
    mock_completion.side_effect = [
        Exception("Rate limit exceeded on key_1"),
        create_mock_completion_response(content="Fallback answer from key_2")
    ]

    res = client.post("/chat", json={"session_id": "s-failover", "message": "Trigger failover"})
    assert res.status_code == 200
    data = res.json()
    assert data["reply"] == "Fallback answer from key_2"
    assert data["metadata"]["key_id"] == "key_2"
    assert data["metadata"]["fallback_attempts"] == 1
    assert data["metadata"]["resolution_source"] == "LIVE_INFERENCE"


# 9. All keys failing returns 503
@patch("app.services.llm_service.litellm.completion")
def test_all_keys_failing_returns_503(mock_completion):
    # Both keys fail
    mock_completion.side_effect = [
        Exception("Quota exceeded on key_1"),
        Exception("Service unavailable on key_2")
    ]

    res = client.post("/chat", json={"session_id": "s-exhaust", "message": "Will fail"})
    assert res.status_code == 503
    assert res.json() == {"detail": "all providers unavailable"}

    # Ensure failed turn is NOT added to history
    hist = client.get("/sessions/s-exhaust/messages")
    assert hist.status_code == 404


# 10. Failure simulation via X-Simulate-Failure header
@patch("app.services.llm_service.litellm.completion")
def test_failure_simulation_header(mock_completion):
    mock_completion.return_value = create_mock_completion_response(content="Success on key_2")

    # A) Simulate key_1 failing with 429 -> should failover to key_2
    res_k1 = client.post(
        "/chat",
        json={"session_id": "s-sim-1", "message": "Test sim key_1"},
        headers={"X-Simulate-Failure": "key_1=429"}
    )
    assert res_k1.status_code == 200
    assert res_k1.json()["metadata"]["key_id"] == "key_2"
    assert res_k1.json()["metadata"]["fallback_attempts"] == 1

    # B) Simulate all keys failing with *=429 -> must return 503
    res_all = client.post(
        "/chat",
        json={"session_id": "s-sim-2", "message": "Test sim all"},
        headers={"X-Simulate-Failure": "*=429"}
    )
    assert res_all.status_code == 503
    assert res_all.json() == {"detail": "all providers unavailable"}

    # C) Simulate key_1=429,key_2=500 -> must return 503
    res_both = client.post(
        "/chat",
        json={"session_id": "s-sim-3", "message": "Test sim both"},
        headers={"X-Simulate-Failure": "key_1=429,key_2=500"}
    )
    assert res_both.status_code == 503
    assert res_both.json() == {"detail": "all providers unavailable"}


# 11. Input validation errors return 422
def test_input_validation():
    # Empty message
    res = client.post("/chat", json={"session_id": "s-val", "message": "   "})
    assert res.status_code == 422

    # Missing message
    res = client.post("/chat", json={"session_id": "s-val"})
    assert res.status_code == 422

    # Missing session_id
    res = client.post("/chat", json={"message": "hello"})
    assert res.status_code == 422

    # Message over 4000 characters
    res = client.post("/chat", json={"session_id": "s-val", "message": "a" * 4001})
    assert res.status_code == 422

    # Invalid JSON
    res = client.post(
        "/chat",
        content="not a json",
        headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 422


# 12. Unknown session returns 404
def test_unknown_session_returns_404():
    res = client.get("/sessions/unknown-session-id-999/messages")
    assert res.status_code == 404
    assert res.json() == {"detail": "session not found"}
