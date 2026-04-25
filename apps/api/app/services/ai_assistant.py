"""AI assistant abstraction.

Designed so the same router code can be backed by:
    - a fully deterministic mock (default)
    - OpenAI / Azure OpenAI / Anthropic in production

The mock returns realistic-looking summaries so the front-end can be
demoed without any API key. .env.example documents how to switch.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from sqlalchemy.orm import Session

from app import models
from app.config import get_settings


@dataclass
class AIResult:
    title: str
    summary: str
    bullet_points: list[str]
    confidence: float = 0.85
    suggested_tasks: list[str] | None = None

    def to_dict(self) -> dict:
        d = asdict(self)
        if d["suggested_tasks"] is None:
            d["suggested_tasks"] = []
        return d


class MockAIProvider:
    """Deterministic, offline AI provider - safe for CI and demos."""

    def customer_summary(self, db: Session, account_id: int) -> AIResult:
        account = db.get(models.Account, account_id)
        if account is None:
            return AIResult(
                title="Customer summary unavailable",
                summary="No account found with the given id.",
                bullet_points=[],
                confidence=0.0,
            )
        opps = db.query(models.Opportunity).filter(models.Opportunity.account_id == account_id).all()
        won_value = sum(o.amount for o in opps if o.stage == models.OpportunityStage.won)
        pipeline_value = sum(o.amount for o in opps if o.stage not in (models.OpportunityStage.won, models.OpportunityStage.lost))
        return AIResult(
            title=f"{account.name} - Customer 360",
            summary=(
                f"{account.name} is a {account.industry or 'enterprise'} customer in {account.region or 'APAC'} "
                f"with {len(opps)} known opportunities. Realised revenue is ${won_value:,.0f} and "
                f"open pipeline is ${pipeline_value:,.0f}."
            ),
            bullet_points=[
                f"Industry: {account.industry or 'Unknown'}",
                f"Annual revenue: ${(account.annual_revenue or 0):,.0f}",
                f"Open opportunities: {sum(1 for o in opps if o.stage not in (models.OpportunityStage.won, models.OpportunityStage.lost))}",
                f"Won opportunities: {sum(1 for o in opps if o.stage == models.OpportunityStage.won)}",
            ],
            confidence=0.88,
        )

    def next_best_action(self, db: Session, account_id: int) -> AIResult:
        account = db.get(models.Account, account_id)
        if account is None:
            return AIResult(title="No account", summary="Account not found.", bullet_points=[], confidence=0.0)
        opps = db.query(models.Opportunity).filter(models.Opportunity.account_id == account_id).all()
        stale_proposals = [o for o in opps if o.stage == models.OpportunityStage.proposal]
        suggestions: list[str] = []
        if stale_proposals:
            suggestions.append(f"Follow up on {len(stale_proposals)} proposals awaiting decision.")
        suggestions.append("Schedule a quarterly business review to validate value realisation.")
        suggestions.append("Cross-sell Power Automate licensing - high adoption fit based on usage.")
        suggestions.append("Open a Customer Success plan in the Hub if none exists yet.")
        return AIResult(
            title=f"Next best actions for {account.name}",
            summary="Based on pipeline, onboarding and risk signals, the assistant suggests three focus areas.",
            bullet_points=suggestions,
            confidence=0.78,
            suggested_tasks=[
                "Schedule QBR meeting next sprint",
                "Send tailored Power Automate ROI report",
                "Open Customer Success plan with target NPS goal",
            ],
        )

    def meeting_notes_to_tasks(self, notes: str, project_id: int | None = None) -> AIResult:
        # Naive but deterministic extraction: bullet lines and lines starting
        # with action verbs are treated as tasks.
        lines = [ln.strip(" -*\t") for ln in notes.splitlines() if ln.strip()]
        verbs = (
            "follow up",
            "schedule",
            "send",
            "prepare",
            "review",
            "draft",
            "configure",
            "test",
            "deploy",
            "verify",
        )
        tasks: list[str] = [ln for ln in lines if ln.lower().startswith(verbs)]
        if not tasks:
            tasks = lines[: min(5, len(lines))]
        return AIResult(
            title="Action items from meeting notes",
            summary=f"Extracted {len(tasks)} candidate action items from the supplied notes.",
            bullet_points=tasks,
            confidence=0.7,
            suggested_tasks=tasks,
        )

    def risk_explanation(self, db: Session, project_id: int) -> AIResult:
        project = db.get(models.CustomerOnboardingProject, project_id)
        if project is None:
            return AIResult(title="Project missing", summary="No such project.", bullet_points=[], confidence=0.0)
        late_tasks = [t for t in project.tasks if t.status != models.TaskStatus.done]
        return AIResult(
            title=f"Risk assessment for {project.project_name}",
            summary=(
                f"Project '{project.project_name}' currently has health score "
                f"{project.health_score:.0f}/100 with {len(late_tasks)} open tasks."
            ),
            bullet_points=[
                f"Status: {project.status}",
                f"Open tasks: {len(late_tasks)}",
                f"Target go-live: {project.target_go_live.isoformat() if project.target_go_live else 'not set'}",
                "Recommended mitigation: weekly executive sponsor sync.",
            ],
            confidence=0.74,
            suggested_tasks=[
                "Confirm go-live date with sponsor",
                "Run risk-focused steering committee",
                "Reassess resource allocation",
            ],
        )


_provider: MockAIProvider | None = None


def get_ai_provider() -> MockAIProvider:
    global _provider
    settings = get_settings()
    if settings.ai_provider != "mock":
        # Future: branch by settings.ai_provider and return a real
        # OpenAI/Anthropic/Azure-OpenAI client. For this demo we keep the
        # deterministic mock so reviewers can run the project offline.
        raise RuntimeError(
            "Live AI providers are not implemented in this demo. "
            "Keep AI_PROVIDER=mock or extend ai_assistant.py."
        )
    if _provider is None:
        _provider = MockAIProvider()
    return _provider
