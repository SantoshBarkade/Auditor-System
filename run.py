"""
NEXORA - Server Entry Point
Handles Windows event loop compatibility for psycopg async driver and boots FastAPI.
"""
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    print("=" * 60)
    print("  NEXORA — AI-Driven Network Security Compliance Auditor")
    print("  Backend API:  http://127.0.0.1:8000")
    print("  Swagger Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=False, loop="none")
