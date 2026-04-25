"""BPM end-to-end: draft -> submit -> approve x N -> sync to BC."""
from fastapi.testclient import TestClient


def test_bpm_full_flow(client: TestClient) -> None:
    r = client.post("/api/bpm/requests", json={
        "request_type": "VendorPayment",
        "title": "Cloud invoice",
        "requester": "finance@partner.test",
        "amount": 5000,
        "currency": "USD",
        "payload": {"vendor": "Cloud Pros"},
        "approvers": ["manager@partner.test", "finance.lead@partner.test"],
    })
    assert r.status_code == 201, r.text
    req = r.json()
    assert req["status"] == "Draft"
    assert len(req["steps"]) == 2

    r = client.post(f"/api/bpm/requests/{req['id']}/submit")
    assert r.status_code == 200
    assert r.json()["status"] == "Submitted"

    # Approver must match
    r = client.post(f"/api/bpm/requests/{req['id']}/approve", json={"approver": "wrong@partner.test"})
    assert r.status_code == 403

    r = client.post(f"/api/bpm/requests/{req['id']}/approve", json={"approver": "manager@partner.test", "comment": "ok"})
    assert r.status_code == 200
    r = client.post(f"/api/bpm/requests/{req['id']}/approve", json={"approver": "finance.lead@partner.test", "comment": "ok"})
    assert r.status_code == 200
    assert r.json()["status"] == "Approved"

    r = client.post(f"/api/bpm/requests/{req['id']}/sync-to-bc")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "Completed"
    assert body["bc_sync_status"] == "ok"
    assert body["bc_sync_reference"]
