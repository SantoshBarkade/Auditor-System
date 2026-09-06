"""
NEXORA pytest conftest.py
Uses a separate test DB file (nexora_test.db) that is independent of the
production nexora.db held open by uvicorn. The test DB is freshly recreated
before each test session so schema changes are always reflected.
"""
import asyncio
import os
import sys
import pytest

# Ensure backend package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Override DATABASE_URL BEFORE any app modules are imported
_TEST_DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend"))
_TEST_DB_PATH = os.path.join(_TEST_DB_DIR, "nexora_test.db")

# Set env var so Settings picks it up via pydantic_settings
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB_PATH}"
os.environ["SYNC_DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def fresh_test_database():
    """
    Session-scoped autouse fixture.
    Deletes and recreates the test DB at the start of each pytest session.
    """
    if os.path.exists(_TEST_DB_PATH):
        try:
            os.remove(_TEST_DB_PATH)
            print(f"\n[conftest] Removed stale test DB: {_TEST_DB_PATH}")
        except PermissionError:
            print(f"\n[conftest] WARNING: Could not remove {_TEST_DB_PATH} — it may be in use.")

    from backend.app.core.database import init_db

    loop = asyncio.new_event_loop()
    loop.run_until_complete(init_db())
    loop.close()
    print(f"[conftest] Test DB initialised: {_TEST_DB_PATH}")

    yield


@pytest.fixture
async def async_session():
    """Provides an isolated AsyncSession for test functions."""
    from backend.app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session
