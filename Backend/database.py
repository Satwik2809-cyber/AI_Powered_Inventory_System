# backend/database.py

from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Read DB config from .env
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=False  # set False later in production
)

# Create tables
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

# ✅ FastAPI dependency (THIS FIXES YOUR ERROR)
def get_db():
    with Session(engine) as session:
        yield session
