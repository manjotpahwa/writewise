from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.suggestion import SuggestionAction, Platform

class SuggestionBase(BaseModel):
    original_text: str
    suggested_text: str
    rationale: Optional[str] = None
    platform: Platform
    goal_category: str
    confidence: float

class SuggestionCreate(SuggestionBase):
    text_length: int

class SuggestionUpdate(BaseModel):
    action: SuggestionAction

class SuggestionResponse(SuggestionBase):
    id: int
    user_id: int
    action: Optional[SuggestionAction] = None
    text_length: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True