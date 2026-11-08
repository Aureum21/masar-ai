import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config.runtime import load_environment, database_url

load_environment()

# Default to the local docker postgres assuming standard postgres:postgres credentials and port 5432.
DATABASE_URL = database_url()

# Neon & standard Postgres connection strings use 'postgresql://' instead of 'postgresql+asyncpg://'
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
from urllib.parse import urlparse, urlunparse
parsed = urlparse(DATABASE_URL)
if "neon.tech" in DATABASE_URL or "ssl" in parsed.query or "sslmode" in parsed.query:
    connect_args["ssl"] = True
    # Strip libpq query parameters that asyncpg doesn't accept
    DATABASE_URL = urlunparse((parsed.scheme, parsed.netloc, parsed.path, '', '', ''))

engine = create_async_engine(DATABASE_URL, connect_args=connect_args, echo=False, pool_pre_ping=True, pool_recycle=300)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()