import sys
import os

# Guarantee project root and backend are on sys.path in all runtime environments (e.g. Vercel Serverless / Services)
_app_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.dirname(_app_dir)
_proj_root = os.path.dirname(_backend_dir)
for _p in (_proj_root, _backend_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.routes import (
    unresolved,
    posture,
    health,
    configurations,
    audits,
    findings,
    blockchain,
    reports,
    dashboard,
    settings as settings_route
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield

app = FastAPI(
    title="NEXORA Backend API",
    description="AI-Driven Multi-Vendor Network Security Compliance Auditor for SIH 2026 (SIH26155)",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration for React frontend: supports localhost + Vercel deployment domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers with /api/v1 prefix
API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(configurations.router, prefix=API_PREFIX)
app.include_router(audits.router, prefix=API_PREFIX)
app.include_router(findings.router, prefix=API_PREFIX)
app.include_router(posture.router, prefix=API_PREFIX)
app.include_router(blockchain.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(unresolved.router, prefix=API_PREFIX)
app.include_router(settings_route.router, prefix=API_PREFIX)

# Global exception handler - prevent stack trace leaks in production
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred in the NEXORA security engine.",
            "details": str(exc) if settings.DEBUG else "Contact the system administrator."
        }
    )

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "tagline": settings.DESCRIPTION,
        "sih_id": settings.SIH_PROBLEM_ID,
        "team": settings.TEAM_NAME,
        "api_docs": "/docs",
        "api_v1": "/api/v1/health"
    }

if __name__ == "__main__":
    import sys
    import asyncio
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False, loop="none")
