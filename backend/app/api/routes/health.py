from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "sih_problem_id": settings.SIH_PROBLEM_ID,
        "team": settings.TEAM_NAME,
        "theme": settings.THEME,
        "ai_mode": "Gemini Active" if settings.GEMINI_API_KEY else "Deterministic Fallback Active",
        "supported_vendors": ["Cisco", "Fortinet", "Juniper"]
    }
