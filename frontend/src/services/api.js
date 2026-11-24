const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return await res.json();
}

export async function sendChatMessage({ sessionId, message, systemPrompt, simulateFailure }) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (simulateFailure) {
    headers['X-Simulate-Failure'] = simulateFailure;
  }

  const payload = {
    session_id: sessionId,
    message: message.trim(),
  };

  if (systemPrompt && systemPrompt.trim()) {
    payload.system_prompt = systemPrompt.trim();
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = typeof data.detail === 'string' 
      ? data.detail 
      : JSON.stringify(data.detail) || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function fetchSessionMessages(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
  if (res.status === 404) {
    return { session_id: sessionId, messages: [] };
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch session history (${res.status})`);
  }
  return await res.json();
}
