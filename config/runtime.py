"""Explicit environment loading. Test mode never discovers project secrets."""
import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv


def load_environment():
    if os.getenv("MASAR_ENV") not in {"test", "production"}:
        load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def database_url():
    load_environment()
    value = os.getenv("DATABASE_URL")
    if os.getenv("MASAR_ENV") == "test":
        if not value:
            raise RuntimeError("Test mode requires an explicit isolated DATABASE_URL")
        parsed = urlparse(value)
        if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.port != 55432 or parsed.path != "/masar_phase0":
            raise RuntimeError("Test database must be localhost:55432/masar_phase0")
    if os.getenv("MASAR_ENV") == "production" and not value:
        raise RuntimeError("Production requires DATABASE_URL")
    return value or "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
