import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.endpoints.documents import router as documents_router

# ==========================================
# 1. Lifespan Event Handler (DB Initialization)
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan Context Manager.
    Automatically creates all SQLAlchemy ORM database tables on startup.
    """
    async with engine.begin() as conn:
        # Executes table creation matching our models asynchronously
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    # Cleanup operations (if any) go here during shutdown

# ==========================================
# 2. FastAPI Application Configuration
# ==========================================

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent OCR and structured data extraction engine using LangGraph and Gemini.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS (Cross-Origin Resource Sharing)
# Configured to permit localhost next.js developments natively
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Loosened to allow easy full-stack linking on any origin/port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount the 'uploads' folder as static files endpoint
# Permits frontend applications to render original document previews directly
app.mount(
    "/uploads", 
    StaticFiles(directory=settings.UPLOAD_DIR), 
    name="uploads"
)

# ==========================================
# 3. Router Integration
# ==========================================

# Group all documents endpoints under standard /api prefix
app.include_router(
    documents_router, 
    prefix="/api/documents", 
    tags=["documents"]
)

@app.get("/")
async def root_status():
    """Simple status check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }
