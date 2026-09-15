from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.services.wallet_validator import detect_chain
from app.services.tracing.trace_engine import trace_wallet
from app.services.analysis_pipeline import run_analysis


router = APIRouter(
    prefix="/api/cases",
    tags=["Analysis"]
)


@router.post("/{case_id}/analyze")
async def analyze_case(
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

    chain = detect_chain(case.wallet_address)

    if chain == "UNKNOWN":
        raise HTTPException(
            status_code=400,
            detail="Invalid or unsupported wallet address"
        )

    trace_result = await trace_wallet(
        case.wallet_address,
        max_hops=2
    )

    transactions = trace_result.get(
        "transactions",
        []
    )

    analysis_result = run_analysis(
        case.wallet_address,
        transactions
    )

    case.risk_level = analysis_result["risk"]["risk_level"]
    case.status = "ANALYZED"

    db.commit()
    db.refresh(case)

    return {
        "case_id": case.case_id,
        "wallet_address": case.wallet_address,
        "chain": chain,
        "trace": {
            "max_hops": trace_result["max_hops"],
            "wallets_analyzed": trace_result["wallets_analyzed"],
            "graph": trace_result["graph"]
        },
        "analysis": analysis_result,
        "status": case.status
    }
