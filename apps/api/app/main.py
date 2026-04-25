"""FastAPI entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.routers import ai, audit, automation, bpm, crm, dashboard, onboarding, tickets

logger = logging.getLogger("csah")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db()
    if settings.seed_on_startup:
        from app.seed import seed_if_empty
        with SessionLocal() as db:
            seed_if_empty(db)
        logger.info("Seed data ensured.")
    logger.info("App started in env=%s with database=%s", settings.app_env, settings.database_url)
    yield
    logger.info("App shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Customer Success Automation Hub API",
        version="0.1.0",
        description=(
            "REST API powering the Customer Success Automation Hub demo. "
            "Mirrors a Microsoft Dynamics 365 + Business Central + Power Automate "
            "integration platform with mock connectors for safe local execution."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["Meta"])
    def health() -> dict:
        return {"status": "ok", "version": "0.1.0", "env": settings.app_env}

    app.include_router(dashboard.router)
    app.include_router(crm.router)
    app.include_router(onboarding.router)
    app.include_router(bpm.router)
    app.include_router(automation.router)
    app.include_router(tickets.router)
    app.include_router(ai.router)
    app.include_router(audit.router)

    return app


app = create_app()
