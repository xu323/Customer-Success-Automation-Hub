from __future__ import annotations

import os
import pathlib
import sys

# Make the API package importable when running pytest from anywhere.
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Force a clean SQLite test DB; never reuse the dev one.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_csah.db")
os.environ.setdefault("SEED_ON_STARTUP", "false")
os.environ.setdefault("AI_PROVIDER", "mock")
os.environ.setdefault("DYNAMICS_CRM_MODE", "mock")
os.environ.setdefault("BUSINESS_CENTRAL_MODE", "mock")
os.environ.setdefault("POWER_AUTOMATE_MODE", "mock")

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _isolated_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    get_settings.cache_clear()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()
