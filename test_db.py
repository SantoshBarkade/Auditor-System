import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from sqlalchemy import text
from backend.app.core.database import engine

async def test_connection():
    print(f"Driver/Dialect: {engine.dialect.name} / {engine.dialect.driver}")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            val = result.scalar()
            print(f"SELECT 1 result: {val}")
            
        print("Database connection test: SUCCESS")
    except Exception as e:
        print(f"Database connection test: FAILED - {e}")

if __name__ == '__main__':
    asyncio.run(test_connection())
