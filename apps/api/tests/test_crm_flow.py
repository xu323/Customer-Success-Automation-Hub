"""End-to-end CRM Lead -> Opportunity -> Quote -> Win flow."""
from fastapi.testclient import TestClient


def test_lead_to_quote_flow(client: TestClient) -> None:
    # Create a lead
    r = client.post("/api/crm/leads", json={
        "company": "Acme Corp",
        "contact_name": "Alice Doe",
        "email": "alice@acme.test",
        "source": "Webinar",
        "estimated_value": 100_000,
    })
    assert r.status_code == 201, r.text
    lead = r.json()
    assert lead["status"] == "new"

    # Qualify the lead - should produce an opportunity
    r = client.post(f"/api/crm/leads/{lead['id']}/qualify")
    assert r.status_code == 200, r.text
    opp = r.json()
    assert opp["stage"] == "qualification"

    # Create a quote on that opportunity
    r = client.post("/api/crm/quotes", json={
        "opportunity_id": opp["id"],
        "total_amount": 100_000,
        "line_items": [{"description": "BC Licence x 10", "quantity": 10, "unit_price": 1200}],
    })
    assert r.status_code == 201, r.text
    quote = r.json()
    assert quote["status"] == "draft"
    assert quote["total_amount"] == 100_000

    # Mark opportunity as won - should fire automation but not error
    r = client.post(f"/api/crm/opportunities/{opp['id']}/mark-won")
    assert r.status_code == 200
    assert r.json()["stage"] == "won"
