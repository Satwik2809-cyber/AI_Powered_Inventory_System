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
        Category,
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

    from sqlalchemy import text
    # Auto-migrate eventstock columns & clean up usernames
    with Session(engine) as session:
        try:
            session.execute(text("ALTER TABLE eventstock ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE"))
            session.execute(text("ALTER TABLE eventstock ADD COLUMN IF NOT EXISTS checked_out BOOLEAN DEFAULT FALSE"))
            
            # Clean up existing usernames with leading/trailing spaces
            session.execute(text("UPDATE users SET username = TRIM(username) WHERE username != TRIM(username)"))
            
            # Seed default categories if none exist
            from models import Category
            if not session.query(Category).first():
                default_categories = [
                    "Homecare", "Consumable", "Selfcare", "Books", "Lockets", 
                    "Medicine", "Masala", "Oil", "Bracelet", "Mala", "Key Ring", 
                    "Calendars", "Other SAP", "Pen", "Swaroop", "Stickers", 
                    "Blocks", "Akhand Gyan", "Akhand Gyan Set", "Soaps", "Bracelets",
                    "Bathing Bar", "Agarbatti", "Shampoo", "Dhoop", "Oils", "Clothing", "Other"
                ]
                # Unique them
                default_categories = list(dict.fromkeys(default_categories))
                
                for cat_name in default_categories:
                    session.add(Category(name=cat_name))
            
            session.commit()
        except Exception as e:
            print("Migration info:", e)


def get_db():
    with Session(engine) as session:
        yield session
