from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.schemas.case import CaseCreate, CaseResponse
from app.services.wallet_validator import detect_chain
from app.services.tracing.trace_engine import trace_wallet
from app.database import get_db
from app.models.case import Case


router = APIRouter(prefix="/api/cases", tags=["Cases"])


@router.post("/", response_model=CaseResponse)
def create_case(
    case: CaseCreate,
    db: Session = Depends(get_db)
):

    chain = detect_chain(case.wallet_address)

    if chain == "UNKNOWN":
        raise HTTPException(
            status_code=400,
            detail="Invalid or unsupported wallet address"
        )
      # Check if this wallet already exists
    existing_case = (
        db.query(Case)
        .filter(
            Case.wallet_address.ilike(case.wallet_address)
        )
        .order_by(Case.id.desc())
        .first()
    )

    if existing_case:
        return {
            "case_id": existing_case.case_id,
            "wallet_address": existing_case.wallet_address,
            "chain": existing_case.chain,
            "status": existing_case.status
        }

    last_case = db.query(Case).order_by(Case.id.desc()).first()

    if last_case:
        next_number = last_case.id + 1
    else:
        next_number = 1

    case_id = f"CASE-{next_number:03d}"

    new_case = Case(
        case_id=case_id,
        complaint_id=case.complaint_id,
        wallet_address=case.wallet_address,
        chain=chain,
        fraud_type=case.fraud_type,
        amount=case.amount,
        currency=case.currency,
        risk_level="UNKNOWN",
        status="CREATED"
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "case_id": new_case.case_id,
        "wallet_address": new_case.wallet_address,
        "chain": new_case.chain,
        "status": new_case.status
    }


@router.get("/{case_id}/trace")
async def trace_case(
    case_id: str,
    db: Session = Depends(get_db)
):

    case = db.query(Case).filter(
        Case.case_id == case_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    result = await trace_wallet(
        case.wallet_address,
        max_hops=2
    )

    return {
        "case_id": case.case_id,
        "wallet_address": case.wallet_address,
        "chain": case.chain,
        "trace": result
    }
@router.get("/")
def get_cases(
    db: Session = Depends(get_db)
):
    cases = db.query(Case).order_by(Case.id.desc()).all()

    return [
        {
            "case_id": case.case_id,
            "complaint_id": case.complaint_id,
            "wallet_address": case.wallet_address,
            "chain": case.chain,
            "fraud_type": case.fraud_type,
            "amount": case.amount,
            "currency": case.currency,
            "risk_level": case.risk_level,
            "status": case.status,
        }
        for case in cases
    ]
