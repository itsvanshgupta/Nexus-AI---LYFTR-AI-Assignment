from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    LLM_API_KEYS: str = "mock-key-1,mock-key-2"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ENABLE_FAILURE_SIMULATION: bool = True
    # Keep this aligned with the documented Compose default and a currently
    # supported LiteLLM Gemini route.
    LLM_MODEL: str = "gemini/gemini-3.5-flash-lite"
    CACHE_TYPE: str = "local"

    @property
    def key_pool(self) -> List[tuple[str, str]]:
        """
        Parses comma-separated keys into ordered tuples:
        [('key_1', 'val1'), ('key_2', 'val2'), ...]
        """
        raw_keys = [k.strip() for k in self.LLM_API_KEYS.split(",") if k.strip()]
        return [(f"key_{i+1}", key) for i, key in enumerate(raw_keys)]

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def sqlite_db_path(self) -> str:
        """
        Extracts filesystem path from sqlite URL:
        sqlite:////data/app.db -> /data/app.db
        sqlite:///./data/app.db -> ./data/app.db
        """
        url = self.DATABASE_URL
        if url.startswith("sqlite:////"):
            return "/" + url[len("sqlite:////"):]
        elif url.startswith("sqlite:///"):
            return url[len("sqlite:///"):]
        return url

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")


settings = Settings()
