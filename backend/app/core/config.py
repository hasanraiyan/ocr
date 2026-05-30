import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "DocuSense-API"
    ENVIRONMENT: str = "local"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    DATABASE_URL: str = "sqlite+aiosqlite:///./docusense.db"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: str = ""
    UPLOAD_DIR: str = "./uploads"

    # Supabase Storage (optional — falls back to local ./uploads if not set)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Make sure upload dir exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
