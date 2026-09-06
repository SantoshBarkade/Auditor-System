"""
NEXORA Alembic env.py
Supports both sync (offline) and async (online) migration modes.
Uses the same DATABASE_URL that the application uses from settings.
SAFE: Never drops existing tables. Always check generated migrations before applying.
"""
import sys
import os
from logging.config import fileConfig
from pathlib import Path

# Ensure backend package is importable
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from alembic import context
from sqlalchemy import pool, engine_from_config
from sqlalchemy.ext.asyncio import async_engine_from_config

from backend.app.core.config import settings

# Alembic Config object
config = context.config

# Override sqlalchemy.url with the application DATABASE_URL.
# For async drivers (postgresql+psycopg, sqlite+aiosqlite) we strip the async
# driver prefix for the *sync* offline mode to work without extra drivers.
db_url = settings.DATABASE_URL

# For offline mode (SQL script generation), use sync equivalent
sync_url = (
    db_url
    
    .replace("sqlite+aiosqlite://", "sqlite://")
)

config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import ALL models so Alembic can detect them
from backend.app.core.database import Base  # noqa: F401 — Base must be loaded first
from backend.app.models import models  # noqa: F401
# Unresolved models are imported here once they exist
try:
    from backend.app.models import unresolved  # noqa: F401\n    from backend.app.models import knowledge  # noqa: F401
except ImportError:
    pass

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate SQL scripts without connecting to the database."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=True,  # Required for SQLite ALTER TABLE support
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        render_as_batch=True,  # Required for SQLite ALTER TABLE support
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations directly against the database (sync path)."""
    # Use sync engine for migration execution
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

