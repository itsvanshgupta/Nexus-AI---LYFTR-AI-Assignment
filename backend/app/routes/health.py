from fastapi import APIRouter, HTTPException
from app.config import settings
from app.database import check_db_health
from app.schemas import HealthResponse
from app.services.llm_service import is_cache_active

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    GET /health
    Verifies that:
    - Application is running.
    - SQLite database is reachable.
    - At least two API keys are configured.
    - Cache is enabled.
    """
    db_ok = check_db_health()
    if not db_ok:
        raise HTTPException(status_code=503, detail="Database unreachable")

    keys_count = len(settings.key_pool)
    if keys_count < 2:
        raise HTTPException(
            status_code=503,
            detail=f"At least 2 LLM keys must be configured (found {keys_count})"
        )

    cache_enabled = is_cache_active()
    if not cache_enabled:
        raise HTTPException(status_code=503, detail="LLM cache is disabled")

    return HealthResponse(
        status="ok",
        keys_configured=keys_count,
        cache_enabled=cache_enabled
    )
