from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class SuggestionAction(str, enum.Enum):
    ACCEPTED = "accepted"
    DISMISSED = "dismissed"
    REFINED = "refined"

class Platform(str, enum.Enum):
    GMAIL = "gmail"
    SLACK = "slack"
    TEAMS = "teams"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"

class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_text = Column(Text, nullable=False)
    suggested_text = Column(Text, nullable=False)
    rationale = Column(Text, nullable=True)
    platform = Column(SQLEnum(Platform), nullable=False)
    goal_category = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    action = Column(SQLEnum(SuggestionAction), nullable=True)
    text_length = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())