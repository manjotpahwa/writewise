from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()

class GoalCategory(str, enum.Enum):
    PROFESSIONAL = "professional"
    PERSONAL = "personal"
    ACADEMIC = "academic"

class GoalPrimary(str, enum.Enum):
    CONFIDENCE = "confidence"
    CLARITY = "clarity"
    WARMTH = "warmth"
    CONCISENESS = "conciseness"

class WritingGoal(Base):
    __tablename__ = "writing_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(SQLEnum(GoalCategory), nullable=False)
    primary_goal = Column(SQLEnum(GoalPrimary), nullable=False)
    customizations = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())