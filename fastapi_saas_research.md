# FastAPI SaaS Backend Patterns Research

## Executive Summary

This document provides comprehensive research on FastAPI backend patterns for SaaS applications, focusing on modern best practices for 2024. It covers project structure with SQLAlchemy 2.0 and Pydantic v2, JWT authentication for Chrome extensions, CORS configuration, database design for analytics, rate limiting, Docker deployment, testing patterns, and API versioning strategies.

## 1. Project Structure with SQLAlchemy 2.0 and Pydantic v2

### Modern Architecture Pattern

The recommended structure follows a domain-driven approach inspired by Netflix's Dispatch pattern:

```
fastapi-project/
├── alembic/                    # Database migrations
├── src/
│   ├── auth/
│   │   ├── router.py           # FastAPI routes
│   │   ├── schemas.py          # Pydantic models
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── dependencies.py     # Dependency injection
│   │   ├── service.py          # Business logic
│   │   └── utils.py
│   ├── users/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   ├── service.py
│   │   └── repository.py       # Data access layer
│   ├── analytics/
│   │   ├── router.py
│   │   ├── schemas.py
│   │   ├── models.py
│   │   └── service.py
│   └── subscriptions/
├── tests/
├── docker-compose.yml
└── pyproject.toml
```

### Key Benefits of 2024 Architecture

- **Domain-driven organization**: Groups related functionality together instead of separating by file type
- **Separation of concerns**: Clear distinction between SQLAlchemy models and Pydantic schemas
- **Async-first design**: Leverages SQLAlchemy 2.0's async capabilities for better performance
- **Dependency caching**: FastAPI's dependency system caches same dependencies within requests

### SQLAlchemy 2.0 & Pydantic v2 Integration

```python
# models.py - SQLAlchemy 2.0 model
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

# schemas.py - Pydantic v2 schemas
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_premium: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)  # Pydantic v2 syntax
```

### Async Database Session Management

```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost/dbname",
    echo=True
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

## 2. JWT Authentication Patterns for Chrome Extensions

### Authentication Flow Architecture

```python
# auth/service.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(token: str):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception
```

### Chrome Extension Authentication Endpoints

```python
# auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter()

@router.post("/login")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "premium": user.is_premium},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user_premium": user.is_premium
    }

@router.get("/me")
async def get_current_user(
    current_user: User = Depends(get_current_active_user)
):
    return current_user
```

### Chrome Extension JWT Integration

```javascript
// Chrome extension background script
class AuthManager {
    constructor() {
        this.baseURL = 'https://api.your-app.com';
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: email,
                    password: password
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                // Store token in Chrome storage
                await chrome.storage.local.set({
                    'access_token': data.access_token,
                    'token_expires': Date.now() + (data.expires_in * 1000),
                    'user_premium': data.user_premium
                });
                
                return { success: true, premium: data.user_premium };
            } else {
                return { success: false, error: data.detail };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }

    async getStoredToken() {
        const result = await chrome.storage.local.get(['access_token', 'token_expires']);
        
        if (!result.access_token || Date.now() > result.token_expires) {
            return null;
        }
        
        return result.access_token;
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = await this.getStoredToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers
        });
    }
}

// Content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_AUTH_STATUS') {
        chrome.storage.local.get(['access_token', 'user_premium'], (result) => {
            sendResponse({
                authenticated: !!result.access_token,
                premium: result.user_premium || false
            });
        });
        return true;
    }
});
```

## 3. CORS Configuration for Extension-to-API Communication

### Production CORS Setup

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS configuration for Chrome extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-web-app.com",
        "chrome-extension://your-extension-id-here",
        # For development, you might need:
        # "chrome-extension://*"  # Use with caution in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Alternative regex pattern for multiple extensions
from fastapi.middleware.cors import CORSMiddleware
import re

class CustomCORSMiddleware(CORSMiddleware):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def is_allowed_origin(self, origin: str) -> bool:
        if origin.startswith("chrome-extension://"):
            # Add your extension ID validation logic here
            allowed_extensions = ["dpcnaflfhdkdeijjglelioklbghepbig"]
            extension_id = origin.split("//")[1]
            return extension_id in allowed_extensions
        
        return super().is_allowed_origin(origin)

app.add_middleware(
    CustomCORSMiddleware,
    allow_origins=["https://your-web-app.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Chrome Extension Manifest Configuration

```json
{
    "manifest_version": 3,
    "name": "Writing Coach Extension",
    "version": "1.0",
    "permissions": [
        "storage",
        "activeTab"
    ],
    "host_permissions": [
        "https://api.your-app.com/*"
    ],
    "content_scripts": [
        {
            "matches": ["<all_urls>"],
            "js": ["content.js"]
        }
    ],
    "background": {
        "service_worker": "background.js"
    }
}
```

## 4. Database Schema Design for User Analytics and Progress Tracking

### Core User and Analytics Models

```python
# models/user.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from typing import List

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    premium_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    writing_sessions: Mapped[List["WritingSession"]] = relationship(back_populates="user")
    analytics_events: Mapped[List["AnalyticsEvent"]] = relationship(back_populates="user")
    subscription: Mapped["Subscription"] = relationship(back_populates="user", uselist=False)

# models/analytics.py
class WritingSession(Base):
    __tablename__ = "writing_sessions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    session_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    session_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    words_written: Mapped[int] = mapped_column(Integer, default=0)
    suggestions_accepted: Mapped[int] = mapped_column(Integer, default=0)
    suggestions_rejected: Mapped[int] = mapped_column(Integer, default=0)
    session_data: Mapped[str | None] = mapped_column(Text)  # JSON data
    
    user: Mapped["User"] = relationship(back_populates="writing_sessions")

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(100))  # 'suggestion_shown', 'suggestion_accepted', etc.
    event_data: Mapped[str | None] = mapped_column(Text)  # JSON metadata
    session_id: Mapped[str | None] = mapped_column(String(255))  # Client-side session identifier
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    user: Mapped["User"] = relationship(back_populates="analytics_events")

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    total_words_written: Mapped[int] = mapped_column(Integer, default=0)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_activity: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    writing_goals: Mapped[str | None] = mapped_column(Text)  # JSON goals data
    achievements: Mapped[str | None] = mapped_column(Text)  # JSON achievements
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

# models/subscription.py
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    plan_type: Mapped[str] = mapped_column(String(50))  # 'free', 'premium', 'enterprise'
    status: Mapped[str] = mapped_column(String(50))  # 'active', 'cancelled', 'expired'
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    
    user: Mapped["User"] = relationship(back_populates="subscription")
```

### Analytics Service Layer

```python
# analytics/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def track_event(self, user_id: int, event_type: str, event_data: Dict = None, session_id: str = None):
        event = AnalyticsEvent(
            user_id=user_id,
            event_type=event_type,
            event_data=json.dumps(event_data) if event_data else None,
            session_id=session_id
        )
        self.db.add(event)
        await self.db.commit()
        return event

    async def get_user_analytics(self, user_id: int, days: int = 30) -> Dict:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get writing sessions
        sessions_query = select(WritingSession).where(
            and_(
                WritingSession.user_id == user_id,
                WritingSession.session_start >= start_date
            )
        )
        sessions_result = await self.db.execute(sessions_query)
        sessions = sessions_result.scalars().all()
        
        # Calculate metrics
        total_words = sum(session.words_written for session in sessions)
        total_sessions = len(sessions)
        avg_session_length = sum(
            (session.session_end - session.session_start).total_seconds() / 60
            for session in sessions if session.session_end
        ) / len(sessions) if sessions else 0
        
        # Get daily activity
        daily_activity = {}
        for session in sessions:
            date_key = session.session_start.date().isoformat()
            if date_key not in daily_activity:
                daily_activity[date_key] = {'words': 0, 'sessions': 0}
            daily_activity[date_key]['words'] += session.words_written
            daily_activity[date_key]['sessions'] += 1
        
        return {
            'total_words': total_words,
            'total_sessions': total_sessions,
            'avg_session_length_minutes': round(avg_session_length, 2),
            'daily_activity': daily_activity
        }

    async def update_user_progress(self, user_id: int):
        # Get or create user progress record
        progress_query = select(UserProgress).where(UserProgress.user_id == user_id)
        result = await self.db.execute(progress_query)
        progress = result.scalars().first()
        
        if not progress:
            progress = UserProgress(user_id=user_id)
            self.db.add(progress)
        
        # Calculate totals from writing sessions
        sessions_query = select(
            func.sum(WritingSession.words_written).label('total_words'),
            func.count(WritingSession.id).label('total_sessions')
        ).where(WritingSession.user_id == user_id)
        
        result = await self.db.execute(sessions_query)
        totals = result.first()
        
        progress.total_words_written = totals.total_words or 0
        progress.total_sessions = totals.total_sessions or 0
        progress.last_activity = datetime.utcnow()
        
        await self.db.commit()
        return progress
```

## 5. Rate Limiting and Subscription Management Patterns

### SlowAPI Rate Limiting Implementation

```python
# dependencies.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
import redis
from typing import Optional

# Redis connection for rate limiting
redis_client = redis.Redis(
    host="localhost", 
    port=6379, 
    decode_responses=True
)

# Create limiter with Redis backend
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379"
)

# Custom rate limit function based on user subscription
async def get_user_rate_limit(request: Request) -> str:
    """
    Return rate limit string based on user's subscription level
    """
    # Get user from JWT token
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return "100/hour"  # Anonymous users
    
    try:
        token = auth_header.split(" ")[1]
        user = await verify_token_and_get_user(token)
        
        if user.is_premium:
            return "1000/hour"  # Premium users
        else:
            return "200/hour"   # Registered free users
    except:
        return "100/hour"       # Fallback for invalid tokens

# Rate limiting decorators
def rate_limit_by_subscription(func):
    """
    Decorator to apply subscription-based rate limiting
    """
    async def wrapper(*args, **kwargs):
        request = kwargs.get('request')
        if request:
            limit = await get_user_rate_limit(request)
            # Apply dynamic rate limiting logic here
        return await func(*args, **kwargs)
    return wrapper
```

### Subscription-Aware Endpoints

```python
# subscriptions/router.py
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from .service import SubscriptionService
from .schemas import SubscriptionResponse, UpgradeRequest

router = APIRouter()

@router.get("/subscription/status")
@limiter.limit("10/minute")  # Conservative limit for subscription checks
async def get_subscription_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
):
    subscription = await subscription_service.get_user_subscription(current_user.id)
    return {
        "plan_type": subscription.plan_type,
        "status": subscription.status,
        "expires_at": subscription.expires_at,
        "features": await subscription_service.get_plan_features(subscription.plan_type)
    }

@router.post("/subscription/check-limit")
@limiter.limit("60/minute")  # Allow frequent limit checks
async def check_usage_limit(
    request: Request,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
):
    """Check if user has reached their usage limits"""
    usage = await subscription_service.get_current_usage(current_user.id)
    limits = await subscription_service.get_plan_limits(current_user.subscription.plan_type)
    
    return {
        "within_limits": usage.suggestions_today < limits.daily_suggestions,
        "usage": usage.suggestions_today,
        "limit": limits.daily_suggestions,
        "resets_at": usage.reset_time
    }

# Premium feature endpoint with usage tracking
@router.post("/writing/advanced-analysis")
async def advanced_writing_analysis(
    request: Request,
    text: str,
    current_user: User = Depends(get_current_user),
    subscription_service: SubscriptionService = Depends()
):
    # Check if user has premium access
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403, 
            detail="This feature requires a premium subscription"
        )
    
    # Check usage limits even for premium users
    usage = await subscription_service.get_current_usage(current_user.id)
    limits = await subscription_service.get_plan_limits("premium")
    
    if usage.advanced_analysis_today >= limits.daily_advanced_analysis:
        raise HTTPException(
            status_code=429,
            detail="Daily limit reached for advanced analysis"
        )
    
    # Track usage
    await subscription_service.increment_usage(current_user.id, "advanced_analysis")
    
    # Perform the analysis (implement your AI logic here)
    analysis_result = await perform_advanced_analysis(text)
    
    return {"analysis": analysis_result}
```

### Subscription Service Implementation

```python
# subscriptions/service.py
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        
        # Define plan limits
        self.plan_limits = {
            "free": {
                "daily_suggestions": 10,
                "daily_advanced_analysis": 0,
                "features": ["basic_grammar_check", "basic_style_suggestions"]
            },
            "premium": {
                "daily_suggestions": 500,
                "daily_advanced_analysis": 20,
                "features": [
                    "basic_grammar_check", 
                    "basic_style_suggestions",
                    "advanced_analysis",
                    "tone_adjustment",
                    "plagiarism_check"
                ]
            }
        }

    async def get_user_subscription(self, user_id: int) -> Subscription:
        query = select(Subscription).where(Subscription.user_id == user_id)
        result = await self.db.execute(query)
        subscription = result.scalars().first()
        
        if not subscription:
            # Create free subscription for new users
            subscription = Subscription(
                user_id=user_id,
                plan_type="free",
                status="active"
            )
            self.db.add(subscription)
            await self.db.commit()
        
        return subscription

    async def get_current_usage(self, user_id: int):
        today = datetime.utcnow().date()
        
        # Count today's usage from analytics events
        suggestions_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.user_id == user_id,
                AnalyticsEvent.event_type == "suggestion_generated",
                func.date(AnalyticsEvent.created_at) == today
            )
        )
        
        advanced_analysis_query = select(func.count(AnalyticsEvent.id)).where(
            and_(
                AnalyticsEvent.user_id == user_id,
                AnalyticsEvent.event_type == "advanced_analysis",
                func.date(AnalyticsEvent.created_at) == today
            )
        )
        
        suggestions_result = await self.db.execute(suggestions_query)
        advanced_result = await self.db.execute(advanced_analysis_query)
        
        return {
            "suggestions_today": suggestions_result.scalar(),
            "advanced_analysis_today": advanced_result.scalar(),
            "reset_time": datetime.combine(today + timedelta(days=1), datetime.min.time())
        }

    async def increment_usage(self, user_id: int, usage_type: str):
        event = AnalyticsEvent(
            user_id=user_id,
            event_type=usage_type,
            event_data=json.dumps({"timestamp": datetime.utcnow().isoformat()})
        )
        self.db.add(event)
        await self.db.commit()

    def get_plan_limits(self, plan_type: str):
        return self.plan_limits.get(plan_type, self.plan_limits["free"])

    def get_plan_features(self, plan_type: str):
        return self.plan_limits.get(plan_type, {}).get("features", [])
```

## 6. Docker Deployment with PostgreSQL and Redis

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/writingcoach
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - ENVIRONMENT=production
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/code/app
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=writingcoach
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Production Dockerfile

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/code

# Set work directory
WORKDIR /code

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy project
COPY . .

# Create non-root user
RUN adduser --disabled-password --gecos '' --uid 1000 appuser
RUN chown -R appuser:appuser /code
USER appuser

# Run the application
CMD ["gunicorn", "src.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
```

### NGINX Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream fastapi_app {
        server web:8000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Chrome extension specific headers
        add_header Access-Control-Allow-Origin "chrome-extension://your-extension-id";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";

        client_max_body_size 10M;

        location / {
            proxy_pass http://fastapi_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://fastapi_app/health;
        }
    }
}
```

## 7. Testing Patterns with Pytest and Async Testing

### Test Configuration and Fixtures

```python
# conftest.py
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import get_db, Base
from src.auth.service import create_access_token

# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session():
    # Create test engine
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    TestSessionLocal = sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
async def client(db_session):
    def override_get_db():
        return db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app), 
        base_url="http://test"
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(db_session):
    from src.users.models import User
    from src.auth.service import get_password_hash
    
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpassword"),
        is_active=True,
        is_premium=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
async def premium_user(db_session):
    from src.users.models import User
    from src.auth.service import get_password_hash
    
    user = User(
        email="premium@example.com",
        password_hash=get_password_hash("testpassword"),
        is_active=True,
        is_premium=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def premium_auth_headers(premium_user):
    access_token = create_access_token(
        data={"sub": premium_user.email, "premium": True}
    )
    return {"Authorization": f"Bearer {access_token}"}
```

### Authentication Tests

```python
# tests/test_auth.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    response = await client.post(
        "/auth/login",
        data={
            "username": "test@example.com",
            "password": "testpassword"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "expires_in" in data

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/auth/login",
        data={
            "username": "test@example.com",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

@pytest.mark.asyncio
async def test_protected_endpoint_without_token(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_protected_endpoint_with_token(client: AsyncClient, auth_headers):
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
```

### Analytics and Usage Tests

```python
# tests/test_analytics.py
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_track_writing_session(client: AsyncClient, auth_headers, test_user):
    session_data = {
        "words_written": 150,
        "suggestions_accepted": 3,
        "suggestions_rejected": 1,
        "session_duration": 600  # 10 minutes
    }
    
    response = await client.post(
        "/analytics/writing-session",
        json=session_data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["words_written"] == 150
    assert data["user_id"] == test_user.id

@pytest.mark.asyncio
async def test_get_user_analytics(client: AsyncClient, auth_headers, db_session, test_user):
    # Create some test data
    from src.analytics.models import WritingSession
    
    session = WritingSession(
        user_id=test_user.id,
        words_written=100,
        suggestions_accepted=2,
        session_start=datetime.utcnow() - timedelta(hours=1),
        session_end=datetime.utcnow()
    )
    db_session.add(session)
    await db_session.commit()
    
    response = await client.get("/analytics/dashboard", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_words"] >= 100
    assert data["total_sessions"] >= 1

@pytest.mark.asyncio
async def test_premium_feature_access_control(
    client: AsyncClient, 
    auth_headers, 
    premium_auth_headers
):
    # Test free user cannot access premium feature
    response = await client.post(
        "/writing/advanced-analysis",
        json={"text": "This is a test sentence."},
        headers=auth_headers
    )
    assert response.status_code == 403
    
    # Test premium user can access premium feature
    response = await client.post(
        "/writing/advanced-analysis",
        json={"text": "This is a test sentence."},
        headers=premium_auth_headers
    )
    assert response.status_code == 200
```

### Rate Limiting Tests

```python
# tests/test_rate_limiting.py
import pytest
import asyncio
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_rate_limiting_free_user(client: AsyncClient, auth_headers):
    """Test that free users are rate limited appropriately"""
    
    # Make requests up to the free tier limit
    responses = []
    for i in range(12):  # Assuming 10/minute limit for free users
        response = await client.get("/api/suggestions", headers=auth_headers)
        responses.append(response.status_code)
    
    # First 10 should succeed
    assert all(status == 200 for status in responses[:10])
    
    # 11th and 12th should be rate limited
    assert responses[10] == 429
    assert responses[11] == 429

@pytest.mark.asyncio
async def test_rate_limiting_premium_user(client: AsyncClient, premium_auth_headers):
    """Test that premium users have higher rate limits"""
    
    # Premium users should have much higher limits
    responses = []
    for i in range(15):
        response = await client.get("/api/suggestions", headers=premium_auth_headers)
        responses.append(response.status_code)
    
    # All should succeed for premium users
    assert all(status == 200 for status in responses)

@pytest.mark.asyncio
async def test_subscription_usage_limits(client: AsyncClient, auth_headers):
    """Test daily usage limits for subscription features"""
    
    # Mock multiple requests to reach daily limit
    for i in range(11):  # Assuming 10 daily suggestions for free users
        await client.post(
            "/analytics/event",
            json={"event_type": "suggestion_generated"},
            headers=auth_headers
        )
    
    # Next request should be blocked
    response = await client.post(
        "/writing/suggestion",
        json={"text": "Test text"},
        headers=auth_headers
    )
    
    assert response.status_code == 429
    assert "Daily limit reached" in response.json()["detail"]
```

## 8. API Versioning and Migration Strategies

### URL-Based Versioning Structure

```python
# src/main.py
from fastapi import FastAPI
from src.api.v1.router import router as v1_router
from src.api.v2.router import router as v2_router

app = FastAPI(title="Writing Coach API")

# Include versioned routers
app.include_router(v1_router, prefix="/api/v1", tags=["v1"])
app.include_router(v2_router, prefix="/api/v2", tags=["v2"])

# Default to latest version
app.include_router(v2_router, prefix="/api", tags=["latest"])
```

### Versioned Schemas and Models

```python
# src/api/v1/schemas.py
from pydantic import BaseModel
from typing import List

class SuggestionV1(BaseModel):
    text: str
    confidence: float
    type: str

class AnalysisResponseV1(BaseModel):
    suggestions: List[SuggestionV1]
    word_count: int

# src/api/v2/schemas.py  
from pydantic import BaseModel
from typing import List, Dict, Optional

class SuggestionV2(BaseModel):
    text: str
    confidence: float
    type: str
    explanation: str  # New field in v2
    category: str     # New field in v2

class AnalysisResponseV2(BaseModel):
    suggestions: List[SuggestionV2]
    word_count: int
    readability_score: Optional[float]  # New field in v2
    metadata: Dict[str, any]            # New field in v2
```

### Header-Based Versioning Implementation

```python
# src/api/versioned_router.py
from fastapi import APIRouter, Header, HTTPException
from typing import Optional

router = APIRouter()

@router.post("/writing/analyze")
async def analyze_text(
    text: str,
    x_api_version: Optional[str] = Header(None, alias="X-API-Version")
):
    # Default to latest version if not specified
    version = x_api_version or "2.0"
    
    if version.startswith("1."):
        return await analyze_text_v1(text)
    elif version.startswith("2."):
        return await analyze_text_v2(text)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported API version: {version}. Supported versions: 1.x, 2.x"
        )

async def analyze_text_v1(text: str) -> AnalysisResponseV1:
    # V1 implementation
    suggestions = await get_basic_suggestions(text)
    return AnalysisResponseV1(
        suggestions=[
            SuggestionV1(
                text=s.text,
                confidence=s.confidence,
                type=s.type
            ) for s in suggestions
        ],
        word_count=len(text.split())
    )

async def analyze_text_v2(text: str) -> AnalysisResponseV2:
    # V2 implementation with enhanced features
    suggestions = await get_enhanced_suggestions(text)
    readability = await calculate_readability_score(text)
    
    return AnalysisResponseV2(
        suggestions=[
            SuggestionV2(
                text=s.text,
                confidence=s.confidence,
                type=s.type,
                explanation=s.explanation,
                category=s.category
            ) for s in suggestions
        ],
        word_count=len(text.split()),
        readability_score=readability,
        metadata={
            "processing_time": 0.5,
            "model_version": "2.1",
            "features_used": ["grammar", "style", "readability"]
        }
    )
```

### FastAPI-Versioning Package Implementation

```python
# src/main.py with fastapi-versioning
from fastapi import FastAPI
from fastapi_versioning import VersionedFastAPI, version

app = FastAPI(title="Writing Coach API")

@app.post("/writing/analyze")
@version(1, 0)
async def analyze_text_v1_0(text: str):
    return await analyze_text_v1(text)

@app.post("/writing/analyze")
@version(1, 1)
async def analyze_text_v1_1(text: str):
    # Minor improvements to v1.0
    return await analyze_text_v1_enhanced(text)

@app.post("/writing/analyze")
@version(2, 0)
async def analyze_text_v2_0(text: str):
    return await analyze_text_v2(text)

# Create versioned app
app = VersionedFastAPI(
    app,
    version_format='{major}.{minor}',
    prefix_format='/api/v{major}.{minor}',
    default_version=(2, 0)
)
```

### Migration Strategy Implementation

```python
# src/services/migration_service.py
from typing import Dict, Any
import logging

class APIVersionMigrator:
    """Handle data transformation between API versions"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def migrate_v1_to_v2(self, v1_data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate V1 response format to V2"""
        
        # Transform suggestions
        v2_suggestions = []
        for suggestion in v1_data.get("suggestions", []):
            v2_suggestion = {
                **suggestion,
                "explanation": self._generate_explanation(suggestion),
                "category": self._categorize_suggestion(suggestion)
            }
            v2_suggestions.append(v2_suggestion)
        
        # Add new fields with defaults
        v2_data = {
            **v1_data,
            "suggestions": v2_suggestions,
            "readability_score": None,  # Would be computed if available
            "metadata": {
                "migrated_from": "v1",
                "processing_time": 0.0,
                "model_version": "1.0-compat"
            }
        }
        
        return v2_data
    
    def migrate_v2_to_v1(self, v2_data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate V2 response format to V1 (backward compatibility)"""
        
        # Remove V2-specific fields from suggestions
        v1_suggestions = []
        for suggestion in v2_data.get("suggestions", []):
            v1_suggestion = {
                "text": suggestion["text"],
                "confidence": suggestion["confidence"],
                "type": suggestion["type"]
            }
            v1_suggestions.append(v1_suggestion)
        
        # Remove V2-specific fields
        v1_data = {
            "suggestions": v1_suggestions,
            "word_count": v2_data["word_count"]
        }
        
        return v1_data
    
    def _generate_explanation(self, suggestion: Dict) -> str:
        """Generate explanation for V1 suggestion"""
        type_explanations = {
            "grammar": "This suggestion fixes a grammatical error",
            "style": "This suggestion improves writing style",
            "spelling": "This suggestion corrects a spelling error"
        }
        return type_explanations.get(suggestion["type"], "General writing improvement")
    
    def _categorize_suggestion(self, suggestion: Dict) -> str:
        """Categorize V1 suggestion for V2"""
        return suggestion.get("type", "general")
```

### Version Deprecation Strategy

```python
# src/api/deprecation.py
from fastapi import Request, Response
import warnings
from datetime import datetime, timedelta

class VersionDeprecationMiddleware:
    def __init__(self, app, deprecated_versions: Dict[str, datetime]):
        self.app = app
        self.deprecated_versions = deprecated_versions
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            version = self._extract_version(request)
            
            if version in self.deprecated_versions:
                deprecation_date = self.deprecated_versions[version]
                sunset_date = deprecation_date + timedelta(days=90)  # 90-day notice
                
                # Add deprecation headers
                def add_deprecation_headers(message):
                    if message["type"] == "http.response.start":
                        headers = list(message.get("headers", []))
                        headers.extend([
                            (b"deprecation", str(int(deprecation_date.timestamp())).encode()),
                            (b"sunset", str(int(sunset_date.timestamp())).encode()),
                            (b"link", b'<https://docs.api.com/migration>; rel="successor-version"')
                        ])
                        message["headers"] = headers
                    return message
                
                # Wrap send to add headers
                async def send_with_headers(message):
                    await send(add_deprecation_headers(message))
                
                await self.app(scope, receive, send_with_headers)
                return
        
        await self.app(scope, receive, send)
    
    def _extract_version(self, request: Request) -> str:
        # Extract version from URL path or headers
        path = request.url.path
        if "/v1/" in path:
            return "1.0"
        elif "/v2/" in path:
            return "2.0"
        
        # Check headers
        return request.headers.get("x-api-version", "latest")

# Usage in main.py
app.add_middleware(
    VersionDeprecationMiddleware,
    deprecated_versions={
        "1.0": datetime(2024, 12, 31),  # V1.0 deprecated Dec 31, 2024
    }
)
```

## 9. Authentication Flow Examples for Chrome Extensions

### Complete Authentication Flow Implementation

```javascript
// Chrome Extension: background.js
class WritingCoachAuth {
    constructor() {
        this.baseURL = 'https://api.writingcoach.app';
        this.extensionId = chrome.runtime.id;
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': `chrome-extension://${this.extensionId}`
                },
                body: new URLSearchParams({
                    username: email,
                    password: password
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                await this.storeTokens(data);
                await this.updateUserStatus(data);
                return { success: true, user: data.user };
            } else {
                throw new Error(data.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async storeTokens(authData) {
        const expiresAt = Date.now() + (authData.expires_in * 1000);
        
        await chrome.storage.local.set({
            'access_token': authData.access_token,
            'token_expires': expiresAt,
            'user_premium': authData.user_premium,
            'user_email': authData.user_email,
            'refresh_token': authData.refresh_token // If available
        });
    }

    async getValidToken() {
        const result = await chrome.storage.local.get([
            'access_token', 
            'token_expires', 
            'refresh_token'
        ]);
        
        if (!result.access_token) {
            return null;
        }

        // Check if token is expired
        if (Date.now() > result.token_expires) {
            if (result.refresh_token) {
                return await this.refreshToken(result.refresh_token);
            }
            return null;
        }
        
        return result.access_token;
    }

    async refreshToken(refreshToken) {
        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                await this.storeTokens(data);
                return data.access_token;
            } else {
                await this.logout(); // Clear invalid tokens
                return null;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            await this.logout();
            return null;
        }
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const token = await this.getValidToken();
        
        if (!token) {
            throw new Error('Authentication required');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers
        });

        // Handle authentication errors
        if (response.status === 401) {
            await this.logout();
            throw new Error('Session expired');
        }

        return response;
    }

    async logout() {
        await chrome.storage.local.remove([
            'access_token',
            'token_expires', 
            'user_premium',
            'user_email',
            'refresh_token'
        ]);
        
        // Notify all tabs of logout
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { 
                    type: 'AUTH_STATUS_CHANGED', 
                    authenticated: false 
                });
            });
        });
    }

    async updateUserStatus(authData) {
        // Notify content scripts of authentication status
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'AUTH_STATUS_CHANGED',
                    authenticated: true,
                    premium: authData.user_premium
                });
            });
        });
    }

    // Track usage for rate limiting
    async trackUsage(actionType) {
        try {
            await this.makeAuthenticatedRequest('/analytics/event', {
                method: 'POST',
                body: JSON.stringify({
                    event_type: actionType,
                    timestamp: new Date().toISOString(),
                    source: 'chrome_extension'
                })
            });
        } catch (error) {
            console.error('Usage tracking error:', error);
        }
    }

    // Check subscription limits
    async checkUsageLimit(feature) {
        try {
            const response = await this.makeAuthenticatedRequest('/subscription/check-limit');
            const data = await response.json();
            
            return {
                withinLimits: data.within_limits,
                usage: data.usage,
                limit: data.limit,
                resetTime: data.resets_at
            };
        } catch (error) {
            console.error('Usage limit check error:', error);
            return { withinLimits: false, error: error.message };
        }
    }
}

// Initialize auth manager
const authManager = new WritingCoachAuth();

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            switch (message.type) {
                case 'LOGIN':
                    const loginResult = await authManager.login(message.email, message.password);
                    sendResponse(loginResult);
                    break;

                case 'LOGOUT':
                    await authManager.logout();
                    sendResponse({ success: true });
                    break;

                case 'GET_AUTH_STATUS':
                    const token = await authManager.getValidToken();
                    const storage = await chrome.storage.local.get(['user_premium']);
                    sendResponse({
                        authenticated: !!token,
                        premium: storage.user_premium || false
                    });
                    break;

                case 'MAKE_API_REQUEST':
                    const response = await authManager.makeAuthenticatedRequest(
                        message.endpoint, 
                        message.options
                    );
                    const data = await response.json();
                    sendResponse({ success: true, data });
                    break;

                case 'CHECK_USAGE_LIMIT':
                    const limitStatus = await authManager.checkUsageLimit(message.feature);
                    sendResponse(limitStatus);
                    break;

                case 'TRACK_USAGE':
                    await authManager.trackUsage(message.action);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    return true; // Keep message channel open for async response
});
```

### Content Script Integration

```javascript
// Chrome Extension: content.js
class WritingCoachContent {
    constructor() {
        this.isAuthenticated = false;
        this.isPremium = false;
        this.suggestionCount = 0;
        this.dailyLimit = 0;
        
        this.initializeAuth();
        this.attachEventListeners();
    }

    async initializeAuth() {
        // Check authentication status
        const authStatus = await this.sendMessageToBackground({
            type: 'GET_AUTH_STATUS'
        });
        
        this.isAuthenticated = authStatus.authenticated;
        this.isPremium = authStatus.premium;
        
        if (this.isAuthenticated) {
            await this.checkUsageLimits();
        }
    }

    async sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(message, resolve);
        });
    }

    async checkUsageLimits() {
        const limitStatus = await this.sendMessageToBackground({
            type: 'CHECK_USAGE_LIMIT',
            feature: 'suggestions'
        });
        
        if (limitStatus.withinLimits) {
            this.suggestionCount = limitStatus.usage;
            this.dailyLimit = limitStatus.limit;
        } else {
            this.showLimitReachedMessage(limitStatus);
        }
    }

    async provideSuggestion(textElement) {
        // Check authentication
        if (!this.isAuthenticated) {
            this.showLoginPrompt();
            return;
        }

        // Check usage limits
        if (this.suggestionCount >= this.dailyLimit) {
            this.showUpgradePrompt();
            return;
        }

        try {
            const text = textElement.value || textElement.textContent;
            
            // Make API request for suggestions
            const response = await this.sendMessageToBackground({
                type: 'MAKE_API_REQUEST',
                endpoint: '/writing/analyze',
                options: {
                    method: 'POST',
                    body: JSON.stringify({ text: text })
                }
            });

            if (response.success) {
                this.displaySuggestions(response.data, textElement);
                
                // Track usage
                await this.sendMessageToBackground({
                    type: 'TRACK_USAGE',
                    action: 'suggestion_generated'
                });
                
                this.suggestionCount++;
            } else {
                this.showError(response.error);
            }
            
        } catch (error) {
            console.error('Suggestion error:', error);
            this.showError('Failed to get suggestions');
        }
    }

    displaySuggestions(analysisData, textElement) {
        // Create suggestion UI
        const suggestionPanel = this.createSuggestionPanel();
        
        analysisData.suggestions.forEach((suggestion, index) => {
            const suggestionElement = this.createSuggestionElement(suggestion, index);
            suggestionPanel.appendChild(suggestionElement);
        });
        
        // Position panel near the text element
        this.positionPanel(suggestionPanel, textElement);
        document.body.appendChild(suggestionPanel);
    }

    createSuggestionElement(suggestion, index) {
        const element = document.createElement('div');
        element.className = 'writing-coach-suggestion';
        element.innerHTML = `
            <div class="suggestion-text">${suggestion.text}</div>
            <div class="suggestion-explanation">${suggestion.explanation || ''}</div>
            <div class="suggestion-actions">
                <button class="accept-suggestion" data-index="${index}">Accept</button>
                <button class="reject-suggestion" data-index="${index}">Ignore</button>
            </div>
        `;
        
        // Add event listeners
        element.querySelector('.accept-suggestion').addEventListener('click', () => {
            this.acceptSuggestion(suggestion, index);
        });
        
        element.querySelector('.reject-suggestion').addEventListener('click', () => {
            this.rejectSuggestion(suggestion, index);
        });
        
        return element;
    }

    async acceptSuggestion(suggestion, index) {
        // Track acceptance
        await this.sendMessageToBackground({
            type: 'TRACK_USAGE',
            action: 'suggestion_accepted'
        });
        
        // Apply suggestion logic here
        this.applySuggestionToText(suggestion);
        this.removeSuggestionElement(index);
    }

    async rejectSuggestion(suggestion, index) {
        // Track rejection
        await this.sendMessageToBackground({
            type: 'TRACK_USAGE', 
            action: 'suggestion_rejected'
        });
        
        this.removeSuggestionElement(index);
    }

    showLoginPrompt() {
        const popup = this.createPopup('Login Required', `
            <p>Please log in to use Writing Coach suggestions.</p>
            <button id="open-login">Log In</button>
        `);
        
        popup.querySelector('#open-login').addEventListener('click', () => {
            // Open extension popup or redirect to login
            chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' });
            popup.remove();
        });
    }

    showUpgradePrompt() {
        const message = this.isPremium 
            ? 'You have reached your daily limit. It will reset tomorrow.'
            : 'You have reached your free daily limit. Upgrade to Premium for unlimited suggestions!';
            
        const popup = this.createPopup('Usage Limit Reached', `
            <p>${message}</p>
            ${!this.isPremium ? '<button id="upgrade">Upgrade to Premium</button>' : ''}
        `);
        
        if (!this.isPremium) {
            popup.querySelector('#upgrade').addEventListener('click', () => {
                // Open upgrade page
                window.open('https://writingcoach.app/upgrade', '_blank');
                popup.remove();
            });
        }
    }

    createPopup(title, content) {
        const popup = document.createElement('div');
        popup.className = 'writing-coach-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>${title}</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-body">
                    ${content}
                </div>
            </div>
        `;
        
        popup.querySelector('.close-popup').addEventListener('click', () => {
            popup.remove();
        });
        
        document.body.appendChild(popup);
        return popup;
    }

    attachEventListeners() {
        // Listen for text input events
        document.addEventListener('input', (event) => {
            const target = event.target;
            
            // Check if it's a text input we care about
            if (this.isTextInput(target)) {
                // Debounce suggestions
                clearTimeout(this.suggestionTimeout);
                this.suggestionTimeout = setTimeout(() => {
                    this.provideSuggestion(target);
                }, 1000);
            }
        });

        // Listen for auth status changes from background script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'AUTH_STATUS_CHANGED') {
                this.isAuthenticated = message.authenticated;
                this.isPremium = message.premium || false;
                
                if (this.isAuthenticated) {
                    this.checkUsageLimits();
                }
            }
        });
    }

    isTextInput(element) {
        const tagName = element.tagName.toLowerCase();
        const type = element.type?.toLowerCase();
        
        return (
            (tagName === 'textarea') ||
            (tagName === 'input' && ['text', 'email'].includes(type)) ||
            (element.contentEditable === 'true')
        );
    }
}

// Initialize content script
const writingCoach = new WritingCoachContent();

// Add CSS styles
const styles = `
    .writing-coach-suggestion {
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 12px;
        margin: 4px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 10000;
    }
    
    .writing-coach-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .popup-content {
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 400px;
        width: 90%;
    }
    
    .suggestion-actions button {
        margin: 0 4px;
        padding: 4px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .accept-suggestion {
        background: #4CAF50;
        color: white;
    }
    
    .reject-suggestion {
        background: #f44336;
        color: white;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
```

## 10. Specific Examples for Freemium Writing Coach Application

### Complete Writing Analysis Endpoint

```python
# src/writing/router.py
from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from typing import List, Dict, Optional
from .service import WritingAnalysisService
from .schemas import AnalysisRequest, AnalysisResponse, Suggestion
from ..auth.dependencies import get_current_user
from ..subscriptions.service import SubscriptionService

router = APIRouter()
limiter = Limiter(key_func=lambda: "global")

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_text(
    request: Request,
    analysis_request: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    writing_service: WritingAnalysisService = Depends(),
    subscription_service: SubscriptionService = Depends()
):
    # Check subscription limits
    usage = await subscription_service.get_current_usage(current_user.id)
    limits = subscription_service.get_plan_limits(current_user.subscription.plan_type)
    
    if usage['suggestions_today'] >= limits['daily_suggestions']:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily limit reached",
                "usage": usage['suggestions_today'],
                "limit": limits['daily_suggestions'],
                "reset_time": usage['reset_time'],
                "upgrade_url": "https://writingcoach.app/upgrade" if not current_user.is_premium else None
            }
        )
    
    # Perform analysis based on subscription level
    if current_user.is_premium:
        analysis = await writing_service.advanced_analysis(
            text=analysis_request.text,
            options=analysis_request.options
        )
    else:
        analysis = await writing_service.basic_analysis(
            text=analysis_request.text
        )
    
    # Track usage
    await subscription_service.increment_usage(current_user.id, "suggestion_generated")
    
    return analysis

@router.post("/advanced-analysis", response_model=AnalysisResponse)
async def advanced_analysis(
    request: Request,
    analysis_request: AnalysisRequest,
    current_user: User = Depends(get_current_user),
    writing_service: WritingAnalysisService = Depends(),
    subscription_service: SubscriptionService = Depends()
):
    # Premium feature - check subscription
    if not current_user.is_premium:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Premium feature required",
                "message": "Advanced analysis is available for Premium subscribers only",
                "upgrade_url": "https://writingcoach.app/upgrade"
            }
        )
    
    # Check premium usage limits
    usage = await subscription_service.get_current_usage(current_user.id)
    limits = subscription_service.get_plan_limits("premium")
    
    if usage['advanced_analysis_today'] >= limits['daily_advanced_analysis']:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily premium limit reached",
                "usage": usage['advanced_analysis_today'],
                "limit": limits['daily_advanced_analysis'],
                "reset_time": usage['reset_time']
            }
        )
    
    # Perform advanced analysis
    analysis = await writing_service.premium_analysis(
        text=analysis_request.text,
        options=analysis_request.options
    )
    
    # Track premium usage
    await subscription_service.increment_usage(current_user.id, "advanced_analysis")
    
    return analysis
```

### Writing Analysis Service Implementation

```python
# src/writing/service.py
import asyncio
from typing import List, Dict, Optional
from .schemas import Suggestion, AnalysisResponse
import re
from textstat import flesch_reading_ease, flesch_kincaid_grade

class WritingAnalysisService:
    def __init__(self):
        self.grammar_patterns = [
            (r'\b(there|their|they\'re)\b', 'there/their/they\'re usage'),
            (r'\b(your|you\'re)\b', 'your/you\'re usage'),
            (r'\b(its|it\'s)\b', 'its/it\'s usage'),
            (r'\bthen\s+than\b|\bthan\s+then\b', 'then/than confusion'),
        ]
        
        self.style_patterns = [
            (r'\bvery\s+(\w+)', 'Consider stronger alternatives to "very"'),
            (r'\b(really|actually|basically)\b', 'Remove filler words'),
            (r'\.{2,}', 'Use single periods or ellipsis'),
            (r'!{2,}', 'Use single exclamation marks'),
        ]

    async def basic_analysis(self, text: str) -> AnalysisResponse:
        """Basic analysis for free users"""
        suggestions = []
        
        # Basic grammar check
        suggestions.extend(await self._check_grammar(text))
        
        # Basic style suggestions (limited)
        style_suggestions = await self._check_style(text)
        suggestions.extend(style_suggestions[:3])  # Limit to 3 for free users
        
        # Basic metrics
        word_count = len(text.split())
        sentence_count = len(re.findall(r'[.!?]+', text))
        
        return AnalysisResponse(
            suggestions=suggestions[:5],  # Limit total suggestions for free users
            word_count=word_count,
            sentence_count=sentence_count,
            readability_score=None,  # Premium feature
            metadata={
                "analysis_type": "basic",
                "suggestions_shown": len(suggestions[:5]),
                "upgrade_message": "Upgrade to Premium for unlimited suggestions and advanced analysis"
            }
        )

    async def advanced_analysis(self, text: str, options: Optional[Dict] = None) -> AnalysisResponse:
        """Advanced analysis for premium users"""
        suggestions = []
        
        # All grammar checks
        suggestions.extend(await self._check_grammar(text))
        
        # All style suggestions
        suggestions.extend(await self._check_style(text))
        
        # Advanced checks
        if options and options.get("check_tone", True):
            suggestions.extend(await self._analyze_tone(text))
        
        if options and options.get("check_clarity", True):
            suggestions.extend(await self._analyze_clarity(text))
        
        # Advanced metrics
        word_count = len(text.split())
        sentence_count = len(re.findall(r'[.!?]+', text))
        readability = flesch_reading_ease(text)
        grade_level = flesch_kincaid_grade(text)
        
        return AnalysisResponse(
            suggestions=suggestions,
            word_count=word_count,
            sentence_count=sentence_count,
            readability_score=readability,
            grade_level=grade_level,
            metadata={
                "analysis_type": "advanced",
                "suggestions_shown": len(suggestions),
                "features_used": ["grammar", "style", "tone", "clarity"],
                "processing_time": 0.8
            }
        )

    async def premium_analysis(self, text: str, options: Optional[Dict] = None) -> AnalysisResponse:
        """Premium analysis with all features"""
        # Start all analysis tasks concurrently
        tasks = [
            self._check_grammar(text),
            self._check_style(text),
            self._analyze_tone(text),
            self._analyze_clarity(text),
            self._check_plagiarism(text),
            self._analyze_engagement(text)
        ]
        
        results = await asyncio.gather(*tasks)
        suggestions = []
        for result in results:
            suggestions.extend(result)
        
        # Advanced metrics
        word_count = len(text.split())
        sentence_count = len(re.findall(r'[.!?]+', text))
        readability = flesch_reading_ease(text)
        grade_level = flesch_kincaid_grade(text)
        
        # Premium-only features
        sentiment_score = await self._analyze_sentiment(text)
        keyword_density = await self._analyze_keywords(text)
        
        return AnalysisResponse(
            suggestions=suggestions,
            word_count=word_count,
            sentence_count=sentence_count,
            readability_score=readability,
            grade_level=grade_level,
            sentiment_score=sentiment_score,
            keyword_analysis=keyword_density,
            metadata={
                "analysis_type": "premium",
                "suggestions_shown": len(suggestions),
                "features_used": ["grammar", "style", "tone", "clarity", "plagiarism", "engagement"],
                "model_version": "premium-2.1",
                "processing_time": 1.2
            }
        )

    async def _check_grammar(self, text: str) -> List[Suggestion]:
        suggestions = []
        
        for pattern, description in self.grammar_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                suggestions.append(Suggestion(
                    text=f"Consider reviewing {match.group()}",
                    confidence=0.8,
                    type="grammar",
                    category="grammar",
                    explanation=description,
                    position={"start": match.start(), "end": match.end()},
                    original_text=match.group(),
                    suggested_text=None  # Would need more sophisticated replacement logic
                ))
        
        return suggestions

    async def _check_style(self, text: str) -> List[Suggestion]:
        suggestions = []
        
        for pattern, description in self.style_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                suggestions.append(Suggestion(
                    text=f"Style improvement: {match.group()}",
                    confidence=0.6,
                    type="style",
                    category="style",
                    explanation=description,
                    position={"start": match.start(), "end": match.end()},
                    original_text=match.group()
                ))
        
        return suggestions

    async def _analyze_tone(self, text: str) -> List[Suggestion]:
        # Simplified tone analysis - in production, use ML models
        suggestions = []
        
        # Check for overly formal language
        formal_words = ['utilize', 'facilitate', 'commence', 'terminate']
        for word in formal_words:
            if word.lower() in text.lower():
                suggestions.append(Suggestion(
                    text=f"Consider simpler alternative to '{word}'",
                    confidence=0.7,
                    type="tone",
                    category="formality",
                    explanation="This word might be too formal for your audience",
                    original_text=word
                ))
        
        return suggestions

    async def _analyze_clarity(self, text: str) -> List[Suggestion]:
        suggestions = []
        
        # Check sentence length
        sentences = re.split(r'[.!?]+', text)
        for i, sentence in enumerate(sentences):
            if len(sentence.split()) > 25:
                suggestions.append(Suggestion(
                    text="Consider breaking this long sentence into shorter ones",
                    confidence=0.8,
                    type="clarity",
                    category="sentence_length",
                    explanation="Long sentences can be harder to read and understand",
                    position={"sentence": i}
                ))
        
        return suggestions

    async def _check_plagiarism(self, text: str) -> List[Suggestion]:
        # Placeholder for plagiarism detection
        # In production, integrate with plagiarism detection APIs
        return []

    async def _analyze_engagement(self, text: str) -> List[Suggestion]:
        suggestions = []
        
        # Check for passive voice
        passive_patterns = [
            r'\b(was|were|is|are|been|being)\s+\w+ed\b',
            r'\b(was|were|is|are|been|being)\s+\w+en\b'
        ]
        
        for pattern in passive_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                suggestions.append(Suggestion(
                    text="Consider using active voice",
                    confidence=0.6,
                    type="engagement",
                    category="voice",
                    explanation="Active voice is more engaging and direct",
                    position={"start": match.start(), "end": match.end()},
                    original_text=match.group()
                ))
        
        return suggestions

    async def _analyze_sentiment(self, text: str) -> float:
        # Placeholder for sentiment analysis
        # In production, use sentiment analysis models
        return 0.5

    async def _analyze_keywords(self, text: str) -> Dict:
        # Placeholder for keyword analysis
        words = text.lower().split()
        word_count = len(words)
        
        # Count word frequency
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "top_keywords": dict(sorted_words[:10]),
            "keyword_density": {word: count/word_count for word, count in sorted_words[:5]},
            "total_unique_words": len(word_freq)
        }
```

### Schemas for Writing Analysis

```python
# src/writing/schemas.py
from pydantic import BaseModel
from typing import List, Dict, Optional, Union

class AnalysisRequest(BaseModel):
    text: str
    options: Optional[Dict] = None
    
    class Config:
        schema_extra = {
            "example": {
                "text": "This is a example text for analysis. It has some potential issues that needs to be fixed.",
                "options": {
                    "check_tone": True,
                    "check_clarity": True,
                    "check_engagement": True
                }
            }
        }

class Suggestion(BaseModel):
    text: str
    confidence: float
    type: str  # 'grammar', 'style', 'tone', 'clarity', 'engagement'
    category: str
    explanation: Optional[str] = None
    position: Optional[Dict] = None
    original_text: Optional[str] = None
    suggested_text: Optional[str] = None

class AnalysisResponse(BaseModel):
    suggestions: List[Suggestion]
    word_count: int
    sentence_count: Optional[int] = None
    readability_score: Optional[float] = None
    grade_level: Optional[float] = None
    sentiment_score: Optional[float] = None
    keyword_analysis: Optional[Dict] = None
    metadata: Dict

    class Config:
        schema_extra = {
            "example": {
                "suggestions": [
                    {
                        "text": "Consider reviewing 'This is a example'",
                        "confidence": 0.9,
                        "type": "grammar",
                        "category": "article_usage",
                        "explanation": "Use 'an' before words starting with vowel sounds",
                        "original_text": "a example",
                        "suggested_text": "an example"
                    }
                ],
                "word_count": 20,
                "sentence_count": 2,
                "readability_score": 65.5,
                "metadata": {
                    "analysis_type": "premium",
                    "processing_time": 1.2
                }
            }
        }

class UsageStats(BaseModel):
    suggestions_today: int
    advanced_analysis_today: int
    total_suggestions: int
    streak_days: int
    last_activity: Optional[str] = None

class SubscriptionInfo(BaseModel):
    plan_type: str
    status: str
    features: List[str]
    limits: Dict[str, int]
    expires_at: Optional[str] = None
```

This comprehensive research provides a solid foundation for building a modern FastAPI SaaS backend for a freemium writing coach application with Chrome extension integration. The patterns covered include modern project structure, authentication flows, database design, rate limiting, Docker deployment, testing strategies, and API versioning - all following 2024 best practices.