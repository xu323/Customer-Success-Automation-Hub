"""Mock Power Automate client.

Real flow trigger shape:

    POST https://prod-XX.westus.logic.azure.com:443/workflows/<id>/triggers/manual/paths/invoke?...
    Body: { ... arbitrary JSON ... }

The mock simply records each invocation so the front-end can show a
realistic-looking run history.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.config import get_settings


@dataclass
class PowerAutomateInvokeResult:
    ok: bool
    run_id: str
    started_at: datetime
    flow_name: str
    response: dict[str, Any]


class MockPowerAutomateClient:
    def __init__(self) -> None:
        self._invocations: list[dict[str, Any]] = []

    def invoke_flow(self, flow_name: str, payload: dict[str, Any]) -> PowerAutomateInvokeResult:
        run_id = f"PA-{uuid.uuid4().hex[:10]}"
        result = {
            "ok": True,
            "echo": payload,
            "note": f"mock Power Automate flow '{flow_name}' executed successfully",
        }
        self._invocations.append({"run_id": run_id, "flow_name": flow_name, "payload": payload, "result": result})
        return PowerAutomateInvokeResult(
            ok=True,
            run_id=run_id,
            started_at=datetime.now(UTC),
            flow_name=flow_name,
            response=result,
        )

    def list_invocations(self) -> list[dict[str, Any]]:
        return list(self._invocations)


_singleton: MockPowerAutomateClient | None = None


def get_power_automate_client() -> MockPowerAutomateClient:
    global _singleton
    settings = get_settings()
    if settings.power_automate_mode != "mock":
        raise RuntimeError(
            "Live Power Automate mode is not implemented in this demo. "
            "See docs/research-notes.md for the migration plan."
        )
    if _singleton is None:
        _singleton = MockPowerAutomateClient()
    return _singleton
