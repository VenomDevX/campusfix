import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# SQLite for the prototype. Point DATABASE_URL at Postgres/Supabase to migrate —
# models use only portable column types.
# backend/ folder: data paths don't depend on where the server is launched from.
BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(BASE_DIR / 'campusfix.db').as_posix()}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Uploaded images live on local disk for the prototype (swap for S3/Supabase Storage).
UPLOAD_DIR = BASE_DIR / "uploads"
SAMPLES_DIR = BASE_DIR.parent / "frontend" / "public" / "samples"
UPLOAD_DIR.mkdir(exist_ok=True)
