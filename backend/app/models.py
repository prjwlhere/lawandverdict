# app/models.py
from sqlalchemy import Column, String, Integer
from sqlalchemy.sql import func
from .database import Base

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, index=True)  # uuid string
    user_id = Column(String, index=True)
    device_name = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, default="active")  # active | pending | revoked
    issued_at = Column(Integer, nullable=False)  # epoch seconds
