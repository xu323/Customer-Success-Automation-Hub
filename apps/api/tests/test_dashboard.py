from fastapi.testclient import TestClient


def test_dashboard_summary_works_on_empty_db(client: TestClient) -> None:
    r = client.get("/api/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    for key in (
        "crm_pipeline_value",
        "open_opportunities",
        "leads_to_qualify",
        "quotes_pending",
        "active_onboarding_projects",
        "onboarding_at_risk",
        "pending_approvals",
        "automation_success_rate",
        "open_tickets",
        "breached_tickets",
        "risk_alerts",
        "recent_audit_events",
    ):
        assert key in body
