import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        extra="allow"
    )

    PROJECT_NAME: str = "NEXORA"
    VERSION: str = "1.0.0-production"
    DESCRIPTION: str = "AI-Driven Multi-Vendor Network Security Compliance Auditor"
    SIH_PROBLEM_ID: str = "SIH26155"
    TEAM_NAME: str = "WeirdBits"
    THEME: str = "Blockchain and Cybersecurity"
    DEBUG: bool = False

    # Production CORS: Local dev + Vercel deployment domains
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://nexora.vercel.app"
    ]
    CORS_ORIGIN_REGEX: str | None = r"^https:\/\/.*\.vercel\.app$"
    
    # Upload Security: 5MB maximum file upload
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024

    ADMIN_TOKEN: str = "dev-token-change-in-prod"
    
    # Storage
    DATABASE_URL: str = (
        "sqlite+aiosqlite:////tmp/nexora.db"
        if os.environ.get("VERCEL")
        else f"sqlite+aiosqlite:///{BASE_DIR}/nexora.db"
    )
    SYNC_DATABASE_URL: str = (
        "sqlite:////tmp/nexora.db"
        if os.environ.get("VERCEL")
        else f"sqlite:///{BASE_DIR}/nexora.db"
    )
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v_strip = v.strip()
            if v_strip.startswith("[") and v_strip.endswith("]"):
                import json
                try:
                    return json.loads(v_strip)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if v and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+psycopg://", 1)
        elif v and v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
        return v

    @field_validator("SYNC_DATABASE_URL", mode="after")
    @classmethod
    def normalize_sync_database_url(cls, v: str) -> str:
        if v and v.startswith("postgresql+psycopg://"):
            return v.replace("postgresql+psycopg://", "postgresql://", 1)
        elif v and v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql+asyncpg://", "postgresql://", 1)
        return v

    # Supabase Configuration
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_SECRET_KEY: str | None = None
    SUPABASE_PUBLISHABLE_KEY: str | None = None

    # AI / NVIDIA OpenAI
    NVIDIA_API_KEY: str | None = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.2-11b-vision-instruct"
    
    # Blockchain
    GENESIS_PREVIOUS_HASH: str = "0000000000000000000000000000000000000000000000000000000000000000"
    
    # Paths
    SAMPLE_CONFIGS_DIR: Path = PROJECT_ROOT / "sample_configs"
    REPORTS_DIR: Path = BASE_DIR / "reports"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_CONFIGS_DIR, exist_ok=True)
