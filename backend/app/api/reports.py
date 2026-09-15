from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.case import Case
from app.services.reporting.pdf_report import generate_case_pdf


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)


@router.get("/{case_id}/pdf")
async def download_case_report(
    case_id: str,
    db: Session = Depends(get_db)
):
    case = (
        db.query(Case)
        .filter(Case.case_id == case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found"
        )

    # Lightweight report:
    # No blockchain retracing here.
    trace_result = {
        "max_hops": 0,
        "wallets_analyzed": 0,
        "graph": {}
    }

    analysis = {
        "risk": {
            "risk_score": 0,
            "risk_level": case.risk_level or "UNKNOWN",
            "reasons": [],
            "detected_patterns": []
        },
        "pattern_findings": [],
        "exchange_matches": [],
        "alert": {
            "alert_type": "INVESTIGATION_REPORT",
            "severity": (
                "CRITICAL"
                if case.risk_level == "HIGH"
                else "WARNING"
                if case.risk_level == "MEDIUM"
                else "INFO"
            ),
            "risk_level": case.risk_level or "UNKNOWN",
            "risk_score": 0,
            "generated_at": "Stored investigation result"
        }
    }

    pdf_buffer = generate_case_pdf(
        case,
        trace_result,
        analysis
    )

    filename = (
        f"ShadowTrace_{case.case_id}_Investigation_Report.pdf"
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"'
        }
    )
