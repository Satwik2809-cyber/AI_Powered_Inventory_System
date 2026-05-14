from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

load_dotenv()

# ─────────────────────────────────────────────────────────────────
# Render PostgreSQL provides a full DATABASE_URL env var.
# Locally, fall back to building it from individual vars.
# ─────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
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
    # Render gives "postgres://..." — SQLAlchemy needs "postgresql+psycopg2://..."
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL, echo=False)

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
        LogBook
    )
    SQLModel.metadata.create_all(engine)

def get_db():
    with Session(engine) as session:
        yield session
