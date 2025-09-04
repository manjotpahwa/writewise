from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.goal import GoalCategory, GoalPrimary

class GoalBase(BaseModel):
    category: GoalCategory
    primary_goal: GoalPrimary
    customizations: Optional[Dict[str, Any]] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    category: Optional[GoalCategory] = None
    primary_goal: Optional[GoalPrimary] = None
    customizations: Optional[Dict[str, Any]] = None

class GoalResponse(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True