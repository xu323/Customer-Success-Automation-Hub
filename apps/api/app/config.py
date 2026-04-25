"""Application settings loaded from environment variables.

We rely on pydantic-settings so values are validated and typed. The defaults
make it possible to run the project locally with no .env file at all -
useful when reviewers only want to peek at the code.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Core ----
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # ---- Database ----
    database_url: str = "sqlite:///./app.db"

    # ---- Behaviour flags ----
    seed_on_startup: bool = True

    # ---- CORS ----
    cors_allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ---- AI ----
    ai_provider: str = "mock"
    ai_model: str = "mock-large"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None

    # ---- Mock connector mode flags ----
    dynamics_crm_mode: str = Field(default="mock")
    business_central_mode: str = Field(default="mock")
    power_automate_mode: str = Field(default="mock")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
