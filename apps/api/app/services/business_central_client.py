"""Mock Business Central client.

Real endpoint shape (for reference):

    POST https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environment}/api/v2.0/companies({companyId})/purchaseInvoices
    POST .../paymentJournals

The mock keeps a list of synced documents in memory so the front-end can
visualise what would have been pushed.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.config import get_settings


@dataclass
class BCSyncResult:
    ok: bool
    bc_document_id: str | None
    message: str
    synced_at: datetime


class MockBusinessCentralClient:
    def __init__(self) -> None:
        self._ledger: list[dict[str, Any]] = []

    def push_vendor_payment(self, payload: dict[str, Any]) -> BCSyncResult:
        bc_id = f"BC-VP-{uuid.uuid4().hex[:8]}"
        self._ledger.append({"type": "vendor_payment", "id": bc_id, **payload})
        return BCSyncResult(ok=True, bc_document_id=bc_id, message="Posted to BC mock journal", synced_at=datetime.now(UTC))

    def push_employee_payment(self, payload: dict[str, Any]) -> BCSyncResult:
        bc_id = f"BC-EP-{uuid.uuid4().hex[:8]}"
        self._ledger.append({"type": "employee_payment", "id": bc_id, **payload})
        return BCSyncResult(ok=True, bc_document_id=bc_id, message="Posted to BC mock journal", synced_at=datetime.now(UTC))

    def push_travel_request(self, payload: dict[str, Any]) -> BCSyncResult:
        bc_id = f"BC-TR-{uuid.uuid4().hex[:8]}"
        self._ledger.append({"type": "travel_request", "id": bc_id, **payload})
        return BCSyncResult(ok=True, bc_document_id=bc_id, message="Posted to BC mock journal", synced_at=datetime.now(UTC))

    def list_synced_documents(self) -> list[dict[str, Any]]:
        return list(self._ledger)


_singleton: MockBusinessCentralClient | None = None


def get_bc_client() -> MockBusinessCentralClient:
    global _singleton
    settings = get_settings()
    if settings.business_central_mode != "mock":
        raise RuntimeError(
            "Live Business Central mode is not implemented in this demo. "
            "See docs/research-notes.md for the migration plan."
        )
    if _singleton is None:
        _singleton = MockBusinessCentralClient()
    return _singleton
