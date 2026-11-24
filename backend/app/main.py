import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import init_db
from app.services.llm_service import init_litellm_cache
from app.routes import health, chat, sessions

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nexus-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info("Initializing LiteLLM cache...")
    init_litellm_cache()
    logger.info(f"Loaded {len(settings.key_pool)} LLM keys into pool.")
    yield
    # Shutdown actions
    logger.info("Nexus AI backend shutting down...")


app = FastAPI(
    title="Nexus AI Backend",
    version="1.0.0",
    description="LLM Chatbot API with Key Failover and Response Caching",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.cors_origins
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True if "*" not in origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(sessions.router)


from fastapi.encoders import jsonable_encoder

# Global Error Handlers to guarantee clean JSON detail responses
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Ensure standard 422 format with readable detail."""
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())}
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Guarantee JSON responses for all HTTP errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all to prevent raw stack trace exposure."""
    logger.exception(f"Unhandled server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
