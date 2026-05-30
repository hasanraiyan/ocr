from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith(("postgresql://", "postgres://")):
    # Rewrite to asyncpg driver (psycopg2 is not installed)
    _, rest = db_url.split("://", 1)
    db_url = "postgresql+asyncpg://" + rest

    # Strip query params asyncpg doesn't understand via simple string parsing
    if "?" in db_url:
        base, query = db_url.split("?", 1)
        kept = []
        ssl_required = False
        for param in query.split("&"):
            if param.startswith("sslmode="):
                ssl_required = param.split("=", 1)[1] == "require"
            elif param.startswith("channel_binding="):
                pass  # asyncpg doesn't support this
            elif param:
                kept.append(param)
        db_url = base + ("?" + "&".join(kept) if kept else "")
        if ssl_required:
            connect_args["ssl"] = "require"

elif db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(db_url, connect_args=connect_args, echo=False)

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
