from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Configure connection arguments for SQLite if applicable
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create asynchronous SQLAlchemy engine
engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

# Async session factory
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for SQLAlchemy ORM models
Base = declarative_base()

async def get_db():
    """Async database session dependency generator for FastAPI routes."""
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
