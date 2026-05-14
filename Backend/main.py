from fastapi import Form
from fastapi import FastAPI, APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
import shutil, os
from sqlmodel import Session, select
from database import get_db
import traceback
from datetime import date
from dotenv import load_dotenv
load_dotenv()
from auth_and_users import get_current_user
from models import Product, Sale, Event, ProductBatch
from user_dashboard import router as user_dashboard_router
from auth_and_users import router as auth_router
from inventory import router as inventory_router
from sales_and_events import router as sales_router
from routers.reports import router as reports_router
from routers.logbook import router as logbook_router
from developer import router as developer_router
from image_match import match_product_image, decide_image_match
from ai import AICommand, handle_ai_command
from alert_service import get_alerts, mark_alert_seen
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    from database import create_db_and_tables
    create_db_and_tables()
    yield
    # Shutdown logic (if any) can go here

app = FastAPI(
    title="AI Powered Inventory System",
    version="1.0.0",
    lifespan=lifespan
)

import os
if not os.path.exists("product_images"):
    os.makedirs("product_images")

app.mount("/product_images", StaticFiles(directory="product_images"), name="product_images")


# CORS: allow localhost (dev) + any Vercel deployment URL + optional FRONTEND_URL env
_frontend_url = os.getenv("FRONTEND_URL", "")
ALLOW_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if _frontend_url:
    ALLOW_ORIGINS.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # covers all Vercel preview + prod URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(sales_router)
app.include_router(user_dashboard_router)
app.include_router(reports_router)
app.include_router(logbook_router)
app.include_router(developer_router)
# AI Router
ai_router = APIRouter(tags=["AI Assistant"])

@ai_router.post("/ai/command", response_model=None)
def ai_command(cmd: AICommand):
    return handle_ai_command(cmd)



@ai_router.post("/ai/image-match")
def image_match_api(
    file: UploadFile = File(...),
    context: str = Form(None),
    event_name: str = Form(None)
):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    matches = match_product_image(temp_path, top_k=5, context=context, event_name=event_name)
    decision = decide_image_match(matches)
    os.remove(temp_path)
    return decision
app.include_router(ai_router)
alert_router = APIRouter(prefix="/alerts", tags=["Alerts"])

@alert_router.get("")
def fetch_alerts(db: Session = Depends(get_db)):
    from alert_service import refresh_inventory_alerts
    refresh_inventory_alerts(db)
    return get_alerts()

@alert_router.post("/{alert_id}/seen")
def seen_alert(alert_id: int):
    mark_alert_seen(alert_id)
    return {"status": "ok"}

app.include_router(alert_router)
@app.get("/")
def root():
    return {"status": "Backend running successfully"}
