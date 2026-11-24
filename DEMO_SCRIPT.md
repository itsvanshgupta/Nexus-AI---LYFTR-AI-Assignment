# Nexus AI — 2-3 Minute Video Demo Script

This script guides you step-by-step through recording your 2–3 minute submission video.

---

## ⏱️ Video Breakdown

| Timestamp | Topic | On-Screen Action | Talking Points |
|---|---|---|---|
| **0:00 - 0:30** | Introduction & Architecture | Show UI at `http://localhost:3000` (or live URL) & `/health` endpoint | "Hi everyone! Welcome to Nexus AI, an intelligent, resilient LLM chatbot built with React, FastAPI, SQLite, and LiteLLM. Notice our health indicator shows our application is healthy, SQLite is reachable, and we have 2 API keys loaded with LiteLLM caching active." |
| **0:30 - 1:00** | Multi-Turn Memory | Ask: `"My name is Vansh."` -> Wait for response -> Ask: `"What is my name?"` | "Let's demonstrate multi-turn memory. I tell the bot my name is Vansh. The frontend sends only this new message. In the next turn, I ask 'What is my name?'. The backend retrieves the session history from SQLite, sends the context to LiteLLM, and the bot correctly answers 'Your name is Vansh'." |
| **1:00 - 1:30** | Response Caching (LLM_CACHE) | Click **New Chat**, ask: `"What is the capital of France?"` -> Click **New Chat** again, ask the exact same question. | "Now let's test LiteLLM response caching. In this fresh session, I ask 'What is the capital of France?'. Notice the response is `LIVE_INFERENCE`, key_1, with a latency of around 800ms. Now let's start another new session and ask the exact same question. Look at that: the badge changes to `LLM_CACHE`, latency drops to just 2ms, key_id is null, and fallback_attempts is 0." |
| **1:30 - 2:15** | Key Failover & Simulation Hook | Open the **Simulate Failure** modal (or terminal). Select `key_1=429`. Submit a question. Then select `*=429` and submit. | "Next, the failover mechanism. We support the `X-Simulate-Failure` header. I'll simulate `key_1=429`. When I send a message, key_1 fails, and the system automatically falls back to key_2. The response succeeds with `key_id: key_2` and `fallback_attempts: 1`. Now let's simulate `*=429` where all keys are rate-limited. Notice it cleanly returns HTTP 503 'all providers unavailable', without crashing or corrupting session history." |
| **2:15 - 2:45** | SQLite Storage & Docker Recap | Show `/sessions/{session_id}/messages` and the Docker / Makefile structure. | "Finally, all session messages and assistant metadata are stored in SQLite under a persistent volume at `/data/app.db`. The whole application is containerized with multi-stage Dockerfiles and starts with a simple `make up`. Thank you!" |

---

## Quick Terminal Commands to Keep Ready

1. **Test Health Endpoint**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test Key 1 Failover (curl)**:
   ```bash
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -H "X-Simulate-Failure: key_1=429" \
     -d '{"session_id": "demo-failover", "message": "Explain quantum entanglement briefly"}'
   ```

3. **Test Full Outage (curl)**:
   ```bash
   curl -i -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -H "X-Simulate-Failure: *=429" \
     -d '{"session_id": "demo-outage", "message": "This request will fail"}'
   ```

4. **Inspect SQLite History (curl)**:
   ```bash
   curl http://localhost:8000/sessions/demo-failover/messages
   ```
