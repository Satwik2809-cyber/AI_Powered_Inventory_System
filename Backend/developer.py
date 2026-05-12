from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, delete
from database import engine
from models import (
    User, Product, ProductBatch, StockHistory, 
    Sale, SaleItem, Event, EventDay, EventItem, 
    EventStock, EventStockHistory, EventSeller, 
    EventSale, EventSaleItem, MonthlyCount, UserArea
)
from auth_and_users import get_current_user
from auth import hash_password

router = APIRouter(prefix="/developer", tags=["Developer"])

def require_developer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.username != "Satwik":
        raise HTTPException(status_code=403, detail="Strictly Developer Access Only")
    return current_user

@router.delete("/reset")
def reset_demo_data(current_user: User = Depends(require_developer)):
    """Wipes all demo data across the database while preserving User entries and auth."""
    with Session(engine) as session:
        try:
            # 1. Delete deeply nested sale items
            session.exec(delete(EventSaleItem))
            session.exec(delete(SaleItem))
            
            # 2. Delete parent sales
            session.exec(delete(EventSale))
            session.exec(delete(Sale))
            
            # 3. Delete event stocks and linking
            session.exec(delete(EventStockHistory))
            session.exec(delete(EventStock))
            session.exec(delete(EventItem))
            session.exec(delete(EventSeller))
            
            # 4. Delete events and phases
            session.exec(delete(EventDay))
            session.exec(delete(Event))
            
            # 5. Delete historical accounting and logs
            session.exec(delete(MonthlyCount))
            session.exec(delete(StockHistory))
            
            # 6. Delete products and batches
            session.exec(delete(ProductBatch))
            session.exec(delete(Product))
            
            session.commit()
            return {"message": "Demo data wiped successfully. Users preserved."}
        except Exception as e:
            session.rollback()
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def get_all_users_developer(current_user: User = Depends(require_developer)):
    """Fetch user list for developer credential management."""
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        return [{"id": u.id, "username": u.username, "role": u.role, "name": u.name} for u in users]

from pydantic import BaseModel
class ForcePasswordRequest(BaseModel):
    new_password: str

@router.put("/force-password/{user_id}")
def force_reset_password(user_id: int, req: ForcePasswordRequest, current_user: User = Depends(require_developer)):
    """Overwrites user password immediately."""
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.password_hash = hash_password(req.new_password)
        session.commit()
        return {"message": f"Password dynamically forced for {user.username}"}
