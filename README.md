# Nexus AI — Intelligent LLM Chatbot with Key Failover & Response Caching

Nexus AI is a resilient, production-ready AI chatbot application featuring multi-turn conversation memory, LiteLLM-powered API key failover, built-in response caching, per-request token/latency metrics, and SQLite session persistence.

---

## 1. Live URLs

| Tier | Service | URL |
|---|---|---|
| **Frontend** | Vercel Deployment | `https://nexus-ai-frontend.vercel.app` *(or custom Vercel URL)* |
| **Backend** | Render Deployment | `https://nexus-ai-backend.onrender.com` |
| **Health API** | Health Check Endpoint | `https://nexus-ai-backend.onrender.com/health` |
| **Repository** | GitHub Public Repo | `https://github.com/itsvanshgupta/Nexus-AI---LYFTR-AI-Assignment` |

---

## 2. Run Locally: With Docker and Without

### Prerequisites
- Docker & Docker Compose (for containerized mode)
- Python 3.11+ / 3.12 (for non-docker mode)
- Node.js 18+ & npm (for non-docker mode)

---

### Option A: Running with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/itsvanshgupta/Nexus-AI---LYFTR-AI-Assignment.git
   cd Nexus-AI---LYFTR-AI-Assignment
   ```

2. **Configure Environment Variables**:
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include at least two LLM API keys:
   ```env
   LLM_API_KEYS=your_primary_key,your_secondary_key
   DATABASE_URL=sqlite:////data/app.db
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ENABLE_FAILURE_SIMULATION=true
   LLM_MODEL=gemini/gemini-2.5-flash
   ```

3. **Start the Stack**:
   Using the `Makefile`:
   ```bash
   make up
   ```
   *Or with Docker Compose directly:*
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Applications**:
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

5. **Stop the Stack**:
   ```bash
   make down
   ```

---

### Option B: Running without Docker

#### 1. Backend Setup:
```bash
cd backend
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Run backend (uses sqlite:///./data/app.db locally)
export DATABASE_URL="sqlite:///./data/app.db"
export LLM_API_KEYS="key_1_val,key_2_val"
export ENABLE_FAILURE_SIMULATION="true"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Design Decisions

### A. Key Fallback Mechanism
- **Provider Resilience**: The backend maintains an ordered key pool `[("key_1", ...), ("key_2", ...)]`. When an LLM invocation encounters HTTP 429 (rate limiting), quota exhaustion, connection timeouts, or 5xx provider failures, the exception is caught immediately.
- **Security & Privacy**: Actual API keys are never exposed in responses or logs. Log entries record only `key_1` / `key_2` aliases and sanitized provider error reasons.
- **Graceful Cascade**: The system systematically attempts the next key in the pool, tracking `fallback_attempts`. Only when all configured keys fail does it return HTTP 503 with `{"detail": "all providers unavailable"}`.

### B. LiteLLM Response Caching
- **Native Integration**: Leverages LiteLLM's built-in caching (`litellm.cache = Cache(type="local")`) rather than a custom disconnected cache.
- **Deterministic Cache Key**: The cache key incorporates the model and full dialogue context (system prompt + historical turns + new user message).
- **Cache Hit Semantics**:
  - Exact reply text is retrieved with sub-millisecond latency.
  - Per-request token counts mirror the stored response usage.
  - Returns `resolution_source: "LLM_CACHE"`, `key_id: null`, and `fallback_attempts: 0`.
  - A changed message or different conversational context automatically invalidates cache reuse.

### C. SQLite Session Storage & Persistence
- **Zero External Dependencies**: Stores conversation history locally in SQLite without requiring external Redis or PostgreSQL instances.
- **Container Volume Preservation**: Database lives under a dedicated Docker volume mounted at `/data/app.db` (configured via `DATABASE_URL`), ensuring chat history survives container rebuilds and restarts.
- **Atomic Turns & Integrity**: The `messages` table schema (`id`, `session_id`, `role`, `content`, `metadata`, `created_at`) is automatically initialized on startup with indexing on `session_id`. Failed calls (422, 503) are never written to the session history.

---

## 4. Verification: How to See Failover, Cache Hits & Token Usage

### A. Cache Hit Verification
1. Start a new session in the UI and submit:
   ```
   What is the capital of France?
   ```
   **Observation**: Response badge displays `LIVE_INFERENCE`, `key_1`, latency ~500–1200ms.
2. Click **New Chat** (creating a new session) and submit the exact same question:
   ```
   What is the capital of France?
   ```
   **Observation**: Response badge immediately displays `LLM_CACHE`, `key_id: null`, `fallback_attempts: 0`, and latency drops to ~1–5ms.

---

### B. Failover Verification (`X-Simulate-Failure`)

#### 1. Test Key 1 Failover (key_1 fails with 429 -> key_2 succeeds):
In terminal or via the built-in UI Simulator:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429" \
  -d '{"session_id": "test-failover-1", "message": "Verify key 2 failover"}'
```
**Expected Response**:
```json
{
  "session_id": "test-failover-1",
  "reply": "...",
  "metadata": {
    "resolution_source": "LIVE_INFERENCE",
    "model": "gemini/gemini-2.5-flash",
    "latency_ms": 780,
    "input_tokens": 14,
    "output_tokens": 8,
    "key_id": "key_2",
    "fallback_attempts": 1
  }
}
```

#### 2. Test Complete Outage (*=429 -> Clean HTTP 503):
```bash
curl -i -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: *=429" \
  -d '{"session_id": "test-failover-2", "message": "Verify 503 outage"}'
```
**Expected Response**:
```
HTTP/1.1 503 Service Unavailable
{"detail": "all providers unavailable"}
```
*(Nothing is stored in the database for this session).*

---

### C. Multi-Turn Conversation Memory Verification
1. Turn 1:
   ```
   My name is Vansh.
   ```
   Assistant replies: *"Nice to meet you, Vansh."*
2. Turn 2:
   ```
   What is my name?
   ```
   Assistant replies: *"Your name is Vansh."*
3. Check History:
   ```bash
   curl http://localhost:8000/sessions/{session_id}/messages
   ```
   Returns stored user & assistant messages in chronological order with metadata, excluding system prompt.

---

## 5. Setup Used: Editor and AI Tools

- **IDE / Environment**: Antigravity IDE (VS Code Architecture) on Windows 11.
- **AI Coding Assistant**: Google DeepMind Antigravity Agentic Assistant (Gemini 2.5/Flash) for architectural analysis, test-driven validation, and clean component design.
- **CLI & Testing Tools**: PowerShell 7, Git, Pytest 9, Uvicorn, Vite 5, Nginx Alpine.

---

## 6. Bonus Features

1. **Interactive Failover Simulator Playground in UI**:
   - Built-in GUI modal accessible directly from the header allowing developers to simulate `key_1=429`, `key_1=500`, `*=429`, or custom failure codes with 1 click.
   - Includes real-time `cURL` copy-paste generation for terminal verification.
2. **Dynamic Session System Prompt Drawer**:
   - Allows users to inject or override system prompts per session (`data-testid="system-prompt-input"`).
3. **Expandable Technical Metadata Inspector**:
   - Compact badge pills keep the chat interface clean while allowing engineers to expand and inspect raw Key IDs, Fallback Attempts, and token breakdowns.
4. **Resilient Offline Test Suite**:
   - 13 comprehensive automated tests covering all 12 backend edge cases and frontend contract `data-testid` attributes without consuming real API credits.