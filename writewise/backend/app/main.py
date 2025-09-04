from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis

from app.api.v1.routes import auth, users, goals, analytics, suggestions
from app.core.config import settings
from app.core.database import engine
from app.models import user, goal, suggestion, analytics as analytics_model

# Create database tables
user.Base.metadata.create_all(bind=engine)
goal.Base.metadata.create_all(bind=engine)
suggestion.Base.metadata.create_all(bind=engine)
analytics_model.Base.metadata.create_all(bind=engine)

# Initialize rate limiter
redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0)
limiter = Limiter(key_func=get_remote_address, storage_uri=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}")

app = FastAPI(
    title="WriteWise API",
    version="1.0.0",
    description="AI Writing Coach API for browser extension"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*", "moz-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(goals.router, prefix="/api/v1/goals", tags=["goals"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(suggestions.router, prefix="/api/v1/suggestions", tags=["suggestions"])

@app.get("/")
async def root():
    return {"message": "WriteWise API is running"}

@app.get("/health")
async def health_check():
    try:
        # Check database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        
        # Check Redis connection
        redis_client.ping()
        
        return {
            "status": "healthy",
            "database": "connected",
            "redis": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }