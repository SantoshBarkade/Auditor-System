import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXORA"
    VERSION: str = "1.0.0-prototype"
    DESCRIPTION: str = "AI-Driven Multi-Vendor Network Security Compliance Auditor"
    SIH_PROBLEM_ID: str = "SIH26155"
    TEAM_NAME: str = "WeirdBits"
    THEME: str = "Blockchain & Cybersecurity"
    DEBUG: bool = True  # Set False in production to suppress exception details
    
    # Storage
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/nexora.db"
    SYNC_DATABASE_URL: str = f"sqlite:///{BASE_DIR}/nexora.db"
    
    # AI / Gemini
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # Blockchain
    GENESIS_PREVIOUS_HASH: str = "0000000000000000000000000000000000000000000000000000000000000000"
    
    # Paths
    SAMPLE_CONFIGS_DIR: Path = PROJECT_ROOT / "sample_configs"
    REPORTS_DIR: Path = BASE_DIR / "reports"
    
    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "allow"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_CONFIGS_DIR, exist_ok=True)
