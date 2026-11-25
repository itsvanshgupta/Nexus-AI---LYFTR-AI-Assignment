import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import init_db
from app.routes import chat, health, sessions
from app.services.llm_service import init_litellm_cache

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexus-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info("Initializing LiteLLM cache...")
    init_litellm_cache()
    logger.info("Loaded %s LLM keys into pool.", len(settings.key_pool))
    yield
    logger.info("Nexus AI backend shutting down...")


# The contract has three public API routes; disable FastAPI's extra docs/schema routes.
app = FastAPI(
    title="Nexus AI Backend",
    version="1.0.0",
    description="LLM Chatbot API with Key Failover and Response Caching",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

origins = settings.cors_origins or ["*"]
allow_all_origins = "*" in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Simulate-Failure"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(sessions.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Keep tracebacks in server logs only; never expose internals to clients.
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
