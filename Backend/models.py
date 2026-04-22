from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import BaseModel

# -------------------------
# USER (LOGIN ONLY)
# -------------------------
class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    name: str = Field(default="")
    password_hash: str
    role: str = Field(index=True)  # "admin" or "user"
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# -------------------------
# PRODUCT (MASTER)
# -------------------------
class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str
    rate: float
    image_path: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------
# PRODUCT BATCHES (EXPIRY-BASED STOCK)
# -------------------------
class ProductBatch(SQLModel, table=True):
    __tablename__ = "product_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="products.id")
    quantity: int
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None
    last_restocked_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------
# EVENT (KATHA / SUNDAY / ETC)
# -------------------------
class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    is_multi_day: bool = Field(default=False)
    selling_mode: str = Field(default="area_wise")
    status: str = Field(default="packing")
    days: int = Field(default=1) # added days column
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class EventCreateRequest(BaseModel):
    name: str
    mode: str = "single-day"
    open_sell: bool = True
    start_date: str
    days: Optional[int] = 1


# -------------------------
# EVENT ITEMS (STOCK MOVED FROM MAIN VAULT)
# -------------------------
class EventItem(SQLModel, table=True):
    __tablename__ = "event_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    product_id: int = Field(foreign_key="products.id")
    quantity_allocated: int
    quantity_remaining: int
    added_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------
# EVENT DAYS (DAY 1, DAY 2...)
# -------------------------
class EventDay(SQLModel, table=True):
    __tablename__ = "event_days"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    day_number: int
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

class EventStock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    product_id: int = Field(foreign_key="products.id")
    quantity_taken: int
    quantity_remaining: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EventStockHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    product_id: int = Field(foreign_key="products.id")
    user_id: int = Field(foreign_key="users.id")
    quantity: int
    action: str = Field(default="packed")  # "packed" or "returned"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EventSeller(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    user_id: int = Field(foreign_key="users.id")

class EventSale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="events.id")
    day_number: int
    user_id: int = Field(foreign_key="users.id")
    payment_mode: str  # cash | online
    total_amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EventSaleItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_sale_id: int = Field(foreign_key="eventsale.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: int
    rate: float
    total_price: float


# -------------------------
# SALE (ONE TRANSACTION)
# -------------------------
class Sale(SQLModel, table=True):
    __tablename__ = "sales"

    id: Optional[int] = Field(default=None, primary_key=True)
    sale_type: str  # "daily" or "event"
    event_id: Optional[int] = Field(default=None, foreign_key="events.id")
    event_day_id: Optional[int] = Field(default=None, foreign_key="event_days.id")
    user_id: int = Field(foreign_key="users.id")
    payment_mode: str  # "cash" or "online"
    buyer_name: Optional[str] = None
    total_quantity: int = Field(default=0)
    total_amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


# -------------------------
# SALE ITEMS (MULTI-PRODUCT SALE)
# -------------------------
class SaleItem(SQLModel, table=True):
    __tablename__ = "sale_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sales.id")
    product_id: int = Field(foreign_key="products.id")
    quantity: int
    rate: float
    total_price: float


# -------------------------
# MONTHLY CLOSURE (ACCOUNTING LOCK)
# -------------------------
class MonthlyClosure(SQLModel, table=True):
    __tablename__ = "monthly_closures"

    id: Optional[int] = Field(default=None, primary_key=True)
    month: int
    year: int
    closed_at: datetime = Field(default_factory=datetime.utcnow)

class MonthlyCount(SQLModel, table=True):
    __tablename__ = "monthly_count"
    id: Optional[int] = Field(default=None, primary_key=True)
    start_date: datetime
    end_date: Optional[datetime] = None
    total_cash: float = Field(default=0.0)
    total_online: float = Field(default=0.0)
    grand_total: float = Field(default=0.0)
    created_by: str
    status: str = Field(default="draft") # draft | counting | confirmed
    inventory_snapshot: Optional[str] = None # JSON string
    detailed_report: Optional[str] = None # JSON string
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserArea(SQLModel, table=True):
    __tablename__ = "user_areas"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    category: str

class StockHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(index=True)
    quantity: int

    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None

    restocked_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Alert(BaseModel):
    id: int
    type: str                  # "low_stock", "sale", "event", "expiry"
    title: str
    message: str
    severity: str              # "info" | "warning" | "critical"
    related_id: Optional[int]  # itemId / eventId / saleId
    created_at: datetime
    seen: bool = False

# -------------------------
# REQUEST MODELS
# -------------------------
class ProductCreateRequest(BaseModel):
    name: str
    category: str
    rate: float
    quantity: int = 0
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None

class ProductUpdateRequest(BaseModel):
    name: str
    category: str
    rate: float

class ProductRestockRequest(BaseModel):
    name: str
    category: str
    rate: float
    quantity: int
    manufacturing_date: Optional[date] = None
    expiry_date: Optional[date] = None


class DailySaleItemRequest(BaseModel):
    product_id: Optional[int] = None
    name: str
    category: str
    rate: float
    quantity: int

class DailySaleRequest(BaseModel):
    user_id: int
    payment_mode: str
    items: list[DailySaleItemRequest]

class EventSellItemRequest(BaseModel):
    product_id: Optional[int] = None
    name: str
    category: str
    rate: float
    quantity: int

class EventSellRequest(BaseModel):
    event_name: str
    day_number: int
    user_id: int
    payment_mode: str
    items: list[EventSellItemRequest]
