from fastapi.testclient import TestClient


def test_meeting_notes_to_tasks(client: TestClient) -> None:
    notes = """
    - Follow up with Bryan on data migration
    - Schedule design review for next Tuesday
    - Customer is happy with progress
    """
    r = client.post("/api/ai/meeting-notes-to-tasks", json={"notes": notes})
    assert r.status_code == 200
    body = r.json()
    assert body["title"]
    assert any("Follow up" in b for b in body["bullet_points"])


def test_customer_summary_missing_account(client: TestClient) -> None:
    r = client.post("/api/ai/customer-summary", json={"account_id": 9999})
    assert r.status_code == 200
    body = r.json()
    assert body["confidence"] == 0.0
