from datetime import datetime

from sqlalchemy import Column,Integer, String, Float, DateTime

from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    complaint_id = Column(String(100), nullable=True)
    wallet_address = Column(String(100), nullable=False, index=True)
    chain = Column(String(20), nullable=False)
    fraud_type = Column(String(100), nullable=True)
    amount = Column(Float, nullable=True)
    currency = Column(String(20), nullable=True)
    risk_level = Column(String(20), default="UNKNOWN")
    status = Column(String(30), default="CREATED")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
