from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class AnalyticsEventBase(BaseModel):
    event_name: str
    platform: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class AnalyticsEventCreate(AnalyticsEventBase):
    pass

class AnalyticsEventResponse(AnalyticsEventBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserMetricsResponse(BaseModel):
    user_id: int
    total_suggestions: int
    accepted_suggestions: int
    dismissed_suggestions: int
    refined_suggestions: int
    acceptance_rate: float
    streak_days: int
    last_activity: datetime

    class Config:
        from_attributes = True

class ProgressMetrics(BaseModel):
    suggestion_acceptance_rate: float
    edit_frequency: int
    streak_days: int
    platform_breakdown: Dict[str, int]
    improvement_score: float
    total_suggestions: int
    weekly_activity: Dict[str, int]