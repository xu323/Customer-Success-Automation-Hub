"""CRM router: leads / opportunities / quotes."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.database import get_db
from app.schemas import (
    LeadCreate,
    LeadOut,
    OpportunityCreate,
    OpportunityOut,
    QuoteCreate,
    QuoteOut,
)
from app.services.crm_client import get_crm_client
from app.services.workflow_engine import dispatch_event

router = APIRouter(prefix="/api/crm", tags=["CRM"])


# ---- Leads ----

@router.get("/leads", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db)) -> list[models.Lead]:
    return db.query(models.Lead).order_by(models.Lead.id.desc()).all()


@router.post("/leads", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(body: LeadCreate, db: Session = Depends(get_db)) -> models.Lead:
    lead = models.Lead(**body.model_dump())
    db.add(lead)
    db.flush()
    get_crm_client().upsert_lead({"company": lead.company, "contact_name": lead.contact_name})
    record_event(
        db,
        action_type="lead.created",
        entity_type="Lead",
        entity_id=lead.id,
        message=f"Lead from {lead.company} created",
    )
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/qualify", response_model=OpportunityOut)
def qualify_lead(lead_id: int, db: Session = Depends(get_db)) -> models.Opportunity:
    lead = db.get(models.Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.status == models.LeadStatus.qualified and lead.qualified_opportunity_id:
        opp = db.get(models.Opportunity, lead.qualified_opportunity_id)
        if opp is not None:
            return opp

    account = db.query(models.Account).filter(models.Account.name == lead.company).first()
    if account is None:
        account = models.Account(name=lead.company, industry="Unknown", region="Unknown")
        db.add(account)
        db.flush()

    opp = models.Opportunity(
        name=f"{lead.company} - Initial Engagement",
        account_id=account.id,
        stage=models.OpportunityStage.qualification,
        amount=float(lead.estimated_value or 0.0),
        probability=0.3,
        expected_close_date=datetime.now(UTC) + timedelta(days=45),
        owner=lead.notes and "sales@partner.com",
        description=f"Auto-created from Lead #{lead.id} - {lead.contact_name}",
    )
    db.add(opp)
    db.flush()

    lead.status = models.LeadStatus.qualified
    lead.qualified_opportunity_id = opp.id

    record_event(
        db,
        action_type="lead.qualified",
        entity_type="Lead",
        entity_id=lead.id,
        message=f"Lead #{lead.id} qualified -> Opportunity #{opp.id}",
    )
    db.commit()
    db.refresh(opp)
    return opp


# ---- Opportunities ----

@router.get("/opportunities", response_model=list[OpportunityOut])
def list_opportunities(db: Session = Depends(get_db)) -> list[models.Opportunity]:
    return db.query(models.Opportunity).order_by(models.Opportunity.id.desc()).all()


@router.post("/opportunities", response_model=OpportunityOut, status_code=status.HTTP_201_CREATED)
def create_opportunity(body: OpportunityCreate, db: Session = Depends(get_db)) -> models.Opportunity:
    opp = models.Opportunity(**body.model_dump())
    db.add(opp)
    db.flush()
    record_event(
        db,
        action_type="opportunity.created",
        entity_type="Opportunity",
        entity_id=opp.id,
        message=f"Opportunity '{opp.name}' created",
    )
    db.commit()
    db.refresh(opp)
    return opp


@router.post("/opportunities/{opp_id}/mark-won", response_model=OpportunityOut)
def mark_opportunity_won(opp_id: int, db: Session = Depends(get_db)) -> models.Opportunity:
    opp = db.get(models.Opportunity, opp_id)
    if opp is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    if opp.stage == models.OpportunityStage.won:
        return opp
    opp.stage = models.OpportunityStage.won
    opp.probability = 1.0
    record_event(
        db,
        action_type="opportunity.won",
        entity_type="Opportunity",
        entity_id=opp.id,
        message=f"Opportunity '{opp.name}' marked as Won",
        payload={"amount": opp.amount},
    )
    # Trigger automation: workflows listening on quote.won / opportunity.won
    account_name = opp.account.name if opp.account else "Unknown Customer"
    dispatch_event(
        db,
        "opportunity.won",
        {
            "opportunity_id": opp.id,
            "account_id": opp.account_id,
            "account_name": account_name,
            "amount": opp.amount,
        },
    )
    db.commit()
    db.refresh(opp)
    return opp


# ---- Quotes ----

@router.get("/quotes", response_model=list[QuoteOut])
def list_quotes(db: Session = Depends(get_db)) -> list[models.Quote]:
    return db.query(models.Quote).order_by(models.Quote.id.desc()).all()


@router.post("/quotes", response_model=QuoteOut, status_code=status.HTTP_201_CREATED)
def create_quote(body: QuoteCreate, db: Session = Depends(get_db)) -> models.Quote:
    if db.get(models.Opportunity, body.opportunity_id) is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    quote = models.Quote(
        opportunity_id=body.opportunity_id,
        quote_number=f"Q-{uuid4().hex[:8].upper()}",
        total_amount=body.total_amount,
        currency=body.currency,
        line_items=[item.model_dump() for item in body.line_items],
        valid_until=body.valid_until or datetime.now(UTC) + timedelta(days=30),
        status=models.QuoteStatus.draft,
    )
    db.add(quote)
    db.flush()
    record_event(
        db,
        action_type="quote.created",
        entity_type="Quote",
        entity_id=quote.id,
        message=f"Quote {quote.quote_number} created",
        payload={"total_amount": quote.total_amount, "currency": quote.currency},
    )
    db.commit()
    db.refresh(quote)
    return quote
