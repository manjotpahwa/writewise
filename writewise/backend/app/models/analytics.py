from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_name = Column(String, nullable=False)
    platform = Column(String, nullable=True)
    data = Column(JSON, nullable=True)
    session_id = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class UserMetrics(Base):
    __tablename__ = "user_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    total_suggestions = Column(Integer, default=0)
    accepted_suggestions = Column(Integer, default=0)
    dismissed_suggestions = Column(Integer, default=0)
    refined_suggestions = Column(Integer, default=0)
    acceptance_rate = Column(Float, default=0.0)
    streak_days = Column(Integer, default=0)
    last_activity = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())