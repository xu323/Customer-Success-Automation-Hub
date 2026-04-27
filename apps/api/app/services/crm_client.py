"""Mock Dynamics 365 Sales / Dataverse client.

Why a thin "client" layer? In production, API routers should never reach
out to Dataverse directly - they call this client, which can be swapped
between a mock implementation (deterministic, offline) and a real
implementation (Dataverse Web API + OAuth client credentials).

This file documents the real-world endpoints in comments so a future
contributor can point at exactly what would change to "go live".
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any

from app.config import get_settings


@dataclass
class CRMSyncResult:
    ok: bool
    external_id: str | None
    message: str


class MockCRMClient:
    """In-memory imitation of the Dataverse Web API.

    Real endpoint shapes (for reference):
        POST {resource}/api/data/v9.2/leads
        POST {resource}/api/data/v9.2/opportunities
        POST {resource}/api/data/v9.2/quotes
    """

    def __init__(self) -> None:
        self._store: dict[str, dict[str, Any]] = {}

    def upsert_lead(self, payload: dict[str, Any]) -> CRMSyncResult:
        external_id = payload.get("external_id") or f"crm-lead-{uuid.uuid4().hex[:8]}"
        self._store[external_id] = {"entity": "lead", **payload}
        return CRMSyncResult(ok=True, external_id=external_id, message="upserted in mock CRM")

    def upsert_opportunity(self, payload: dict[str, Any]) -> CRMSyncResult:
        external_id = payload.get("external_id") or f"crm-opp-{uuid.uuid4().hex[:8]}"
        self._store[external_id] = {"entity": "opportunity", **payload}
        return CRMSyncResult(ok=True, external_id=external_id, message="upserted in mock CRM")


_singleton: MockCRMClient | None = None


def get_crm_client() -> MockCRMClient:
    global _singleton
    settings = get_settings()
    if settings.dynamics_crm_mode != "mock":
        # Placeholder - swap in a real Dataverse-backed implementation here.
        raise RuntimeError(
            "Live Dynamics 365 CRM mode is not implemented in this demo. "
            "See docs/research-notes.md for the migration plan."
        )
    if _singleton is None:
        _singleton = MockCRMClient()
    return _singleton
