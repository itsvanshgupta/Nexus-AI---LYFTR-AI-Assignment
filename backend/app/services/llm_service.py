import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
import litellm
from litellm.caching.caching import Cache

from app.config import settings
from app.schemas import ChatMetadata

logger = logging.getLogger(__name__)

# Initialize LiteLLM configuration and in-memory cache
def init_litellm_cache():
    try:
        litellm.cache = Cache(type="local")
        litellm.suppress_debug_info = True
    except Exception as e:
        logger.error(f"Error initializing LiteLLM cache: {e}")


def is_cache_active() -> bool:
    return litellm.cache is not None


def parse_simulation_header(header_val: Optional[str]) -> Dict[str, int]:
    """
    Parses X-Simulate-Failure header:
    - 'key_1=429' -> {'key_1': 429}
    - 'key_1=429,key_2=500' -> {'key_1': 429, 'key_2': 500}
    - '*=429' -> {'*': 429}
    Allowed statuses: 429, 500, 502, 503
    """
    if not header_val or not settings.ENABLE_FAILURE_SIMULATION:
        return {}
    
    simulations = {}
    parts = [p.strip() for p in header_val.split(",") if p.strip()]
    for part in parts:
        if "=" in part:
            k, code_str = part.split("=", 1)
            k = k.strip()
            try:
                code = int(code_str.strip())
                if code in (429, 500, 502, 503):
                    simulations[k] = code
            except ValueError:
                continue
    return simulations


def extract_reply_and_tokens(response: Any, model: str, messages: List[Dict[str, str]]) -> Tuple[str, int, int]:
    """Extract reply string and token counts (prompt, completion) from LiteLLM response."""
    reply = ""
    input_tokens = 0
    output_tokens = 0

    if isinstance(response, dict):
        choices = response.get("choices", [])
        if choices:
            msg = choices[0].get("message", {})
            reply = msg.get("content", "")
        usage = response.get("usage", {})
        if usage:
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
    else:
        if hasattr(response, "choices") and response.choices:
            msg = response.choices[0].message
            reply = getattr(msg, "content", "") or ""
        if hasattr(response, "usage") and response.usage:
            input_tokens = getattr(response.usage, "prompt_tokens", 0) or 0
            output_tokens = getattr(response.usage, "completion_tokens", 0) or 0

    # Ensure valid token counts using token_counter if missing
    if input_tokens == 0:
        try:
            input_tokens = litellm.token_counter(model=model, messages=messages)
        except Exception:
            input_tokens = sum(len(m.get("content", "").split()) for m in messages)
    if output_tokens == 0 and reply:
        try:
            output_tokens = litellm.token_counter(model=model, text=reply)
        except Exception:
            output_tokens = len(reply.split())

    return reply, input_tokens, output_tokens


async def execute_chat(
    model: str,
    messages: List[Dict[str, str]],
    simulate_header: Optional[str] = None
) -> Tuple[str, ChatMetadata]:
    """
    Executes chat completion with LiteLLM caching, ordered API key failover,
    and failover simulation support.
    """
    simulations = parse_simulation_header(simulate_header)
    keys = settings.key_pool

    # If simulation specifies '*' or all configured keys will fail,
    # evaluate failure simulation before returning a cached answer.
    if simulations:
        if "*" in simulations or all(k_id in simulations for k_id, _ in keys):
            raise HTTPException(status_code=503, detail="all providers unavailable")

    # If key_1 is NOT simulated to fail and NO simulation forces fallback:
    # Check LiteLLM cache first
    should_check_cache = True
    if simulations and ("key_1" in simulations or "*" in simulations):
        # Failover test hook is active for the primary key; bypass cache so fallback is executed
        should_check_cache = False

    t_start = time.perf_counter()

    if should_check_cache and litellm.cache is not None:
        try:
            cached_data = litellm.cache.get_cache(model=model, messages=messages)
            if cached_data is not None:
                reply, input_tokens, output_tokens = extract_reply_and_tokens(cached_data, model, messages)
                latency_ms = max(1, int((time.perf_counter() - t_start) * 1000))
                metadata = ChatMetadata(
                    resolution_source="LLM_CACHE",
                    model=model,
                    latency_ms=latency_ms,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    key_id=None,
                    fallback_attempts=0
                )
                return reply, metadata
        except Exception as e:
            logger.warning(f"Error checking cache: {e}")

    # Key fallback loop
    fallback_attempts = 0
    last_error = None

    for key_id, api_key in keys:
        # Check if key has simulated failure
        if simulations and (key_id in simulations or "*" in simulations):
            sim_code = simulations.get(key_id, simulations.get("*"))
            logger.info(f"Simulating failure on {key_id} with status {sim_code}")
            fallback_attempts += 1
            last_error = f"Simulated failure {sim_code} on {key_id}"
            continue

        try:
            logger.info(f"Attempting inference with {key_id}...")
            # Execute completion in threadpool
            response = await run_in_threadpool(
                litellm.completion,
                model=model,
                messages=messages,
                api_key=api_key,
                caching=False # We manage storing in litellm.cache explicitly below
            )

            reply, input_tokens, output_tokens = extract_reply_and_tokens(response, model, messages)
            latency_ms = max(1, int((time.perf_counter() - t_start) * 1000))

            # Store in LiteLLM's built-in cache for subsequent identical requests
            if litellm.cache is not None:
                try:
                    litellm.cache.add_cache(response, model=model, messages=messages)
                except Exception as e:
                    logger.warning(f"Error saving to cache: {e}")

            metadata = ChatMetadata(
                resolution_source="LIVE_INFERENCE",
                model=model,
                latency_ms=latency_ms,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                key_id=key_id,
                fallback_attempts=fallback_attempts
            )
            return reply, metadata

        except Exception as e:
            logger.warning(f"Inference failed with {key_id}: {str(e)}")
            fallback_attempts += 1
            last_error = str(e)
            continue

    # If all configured keys failed
    logger.error(f"All providers exhausted. Last error: {last_error}")
    raise HTTPException(status_code=503, detail="all providers unavailable")
