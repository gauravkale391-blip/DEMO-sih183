from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    wallet_address: str = Field(..., min_length=10)
    complaint_id: str | None = None
    fraud_type: str | None = None
    amount: float | None = None
    currency: str | None = None


class CaseResponse(BaseModel):
    case_id: str
    wallet_address: str
    chain: str
    status: str
