from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# Neon PostgreSQL (production) — provides DATABASE_URL as an env var.
# Format from Neon:
#   postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
#
# SQLAlchemy requires the driver prefix: postgresql+psycopg2://...
# The ?sslmode=require is kept intact so SSL works on Neon.
#
# Local fallback: build from individual DB_* env vars (for local PostgreSQL).
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

connect_args = {}

if not DATABASE_URL:
    # ── Local dev fallback ────────────────────────────────────────────────────
    DB_USER     = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres123")
    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "5432")
    DB_NAME     = os.getenv("DB_NAME", "inventory_db")
    DATABASE_URL = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}"
        f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
else:
    # ── Production (Neon / Render PostgreSQL) ─────────────────────────────────
    # Fix scheme so SQLAlchemy accepts it
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

    # Neon requires SSL — pass sslmode=require explicitly to psycopg2
    # (even if it's already in the URL query string, this ensures it's enforced)
    connect_args = {"sslmode": "require"}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    # Connection pool tuning for Neon serverless (avoids idle connection timeouts)
    pool_pre_ping=True,         # auto-reconnect on stale connections
    pool_recycle=300,           # recycle connections every 5 min
)


def create_db_and_tables():
    from models import (
        User,
        Product,
        ProductBatch,
        Event,
        EventItem,
        EventDay,
        Sale,
        SaleItem,
        MonthlyClosure,
        MonthlyCount,
        UserArea,
        LogBook,
    )
    SQLModel.metadata.create_all(engine)


def get_db():
    with Session(engine) as session:
        yield session
