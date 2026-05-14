from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from database import engine
from models import User, UserArea, Event, EventSeller, Sale, EventSale
from auth import verify_password, hash_password
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from datetime import datetime, timedelta
import traceback
import os

SECRET_KEY = os.getenv("SECRET_KEY", "SUPER_SECRET_KEY_CHANGE_THIS")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480 # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid")

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["Admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

router = APIRouter(tags=["Auth & Users"])

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/auth/login")
def login(data: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == data.username)).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id, "role": user.role},
            expires_delta=access_token_expires
        )

        assigned_areas = session.exec(select(UserArea).where(UserArea.user_id == user.id)).all()
        assigned_events = session.exec(select(EventSeller).where(EventSeller.user_id == user.id)).all()

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "id": user.id,
            "name": getattr(user, "name", user.username),
            "username": user.username,
            "role": user.role,
            "assignedAreas": [a.category for a in assigned_areas],
            "assigned_events": [{"id": e.event_id} for e in assigned_events],
        }

class UserCreateRequest(BaseModel):
    username: str
    name: str
    password: str
    role: str
    assigned_areas: list[str] = []
    assigned_events: list[int] = []

@router.get("/setup-admin")
def setup_admin():
    """One-time endpoint to set up admin on free Render tiers without shell access."""
    with Session(engine) as session:
        existing = session.exec(select(User)).first()
        if existing:
            return {"status": "error", "message": "Admin already exists. Setup disabled for security."}
            
        admin = User(
            username="Admin",
            name="Super Admin",
            password_hash=hash_password("Admin123!"),
            role="Admin"
        )
        session.add(admin)
        session.commit()
        return {"status": "success", "message": "Admin user created successfully! Username: Admin, Password: Admin123!"}

@router.post("/users")
def create_user(data: UserCreateRequest, current_user: User = Depends(require_admin)):
    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == data.username)).first()
        if existing:
            raise HTTPException(400, "Username already exists")

        user = User(
            username=data.username,
            name=data.name,
            password_hash=hash_password(data.password),
            role=data.role
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        for area in data.assigned_areas:
            session.add(UserArea(user_id=user.id, category=area))
            
        for ev_id in data.assigned_events:
            session.add(EventSeller(user_id=user.id, event_id=ev_id))

        session.commit()
        return {"status": "user_created"}

class UserUpdateRequest(BaseModel):
    assigned_areas: list[str] = None
    assigned_events: list[int] = None
    role: str = None
    is_active: bool = None

@router.put("/users/{user_id}")
def update_user(user_id: int, data: UserUpdateRequest, current_user: User = Depends(require_admin)):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
            
        session.commit()
        
        if data.assigned_areas is not None:
            old_areas = session.exec(select(UserArea).where(UserArea.user_id == user_id)).all()
            for area in old_areas:
                session.delete(area)
            for category in data.assigned_areas:
                session.add(UserArea(user_id=user_id, category=category))

        if data.assigned_events is not None:
            old_events = session.exec(select(EventSeller).where(EventSeller.user_id == user_id)).all()
            for seller in old_events:
                session.delete(seller)
            for ev_id in data.assigned_events:
                session.add(EventSeller(user_id=user_id, event_id=ev_id))
                
        session.commit()
        return {"message": "User updated successfully"}

class RoleUpdateRequest(BaseModel):
    role: str

@router.put("/users/{user_id}/role")
def update_user_role(user_id: int, req: RoleUpdateRequest, current_user: User = Depends(require_admin)):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.role = req.role
        session.commit()
        return {"message": "User role updated"}

class UserPasswordUpdateRequest(BaseModel):
    new_password: str

@router.put("/users/{user_id}/password")
def update_user_password(user_id: int, req: UserPasswordUpdateRequest, current_user: User = Depends(get_current_user)):
    # allow user to change their own password, or admin to change it
    if current_user.id != user_id and current_user.role not in ["Admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to change this password")
        
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.password_hash = hash_password(req.new_password)
        session.commit()
        return {"message": "Password updated successfully"}

class UserProfileUpdateRequest(BaseModel):
    name: str

@router.put("/users/{user_id}/profile")
def update_user_profile(user_id: int, req: UserProfileUpdateRequest, current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role not in ["Admin", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to change this profile")
        
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.name = req.name
        session.commit()
        return {"message": "Profile updated successfully"}

@router.get("/users")
def list_users(current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        result = []
        for u in users:
            areas = session.exec(select(UserArea).where(UserArea.user_id == u.id)).all()
            assigned_areas = [a.category for a in areas]
            
            events = session.exec(
                select(Event).join(EventSeller, Event.id == EventSeller.event_id).where(EventSeller.user_id == u.id)
            ).all()
            assigned_events = [{"id": e.id, "name": e.name, "status": e.status} for e in events]
            
            result.append({
                "id": u.id,
                "username": u.username,
                "name": getattr(u, "name", u.username),
                "role": u.role,
                "is_active": u.is_active,
                "assigned_areas": assigned_areas,
                "assigned_events": assigned_events
            })
        return result

@router.get("/users/{user_id}/stats")
def get_user_stats(user_id: int, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        daily_sales = session.exec(select(Sale).where(Sale.user_id == user_id)).all()
        event_sales = session.exec(select(EventSale).where(EventSale.user_id == user_id)).all()
        
        daily_revenue = sum(s.total_amount for s in daily_sales)
        event_revenue = sum(e.total_amount for e in event_sales)
        
        daily_list = []
        for d in daily_sales:
            daily_list.append({
                "date": d.created_at.strftime("%Y-%m-%d"),
                "revenue": d.total_amount
            })
            
        event_list = []
        for e in event_sales:
            event = session.get(Event, e.event_id)
            event_list.append({
                "event_name": event.name if event else f"Event {e.event_id}",
                "revenue": e.total_amount
            })
            
        return {
            "total_sales": len(daily_sales) + len(event_sales),
            "total_revenue": daily_revenue + event_revenue,
            "daily_sales": daily_list,
            "event_sales": event_list
        }
