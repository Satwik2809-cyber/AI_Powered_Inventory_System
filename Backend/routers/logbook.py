from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_db
from models import LogBook
from pydantic import BaseModel

router = APIRouter(prefix="/logbook", tags=["Log Book"])

class LogBookCreate(BaseModel):
    content: str
    created_by: str

class LogBookUpdate(BaseModel):
    content: str

@router.get("/", response_model=List[LogBook])
def get_logbook_entries(session: Session = Depends(get_db)):
    entries = session.exec(select(LogBook).order_by(LogBook.created_at.desc())).all()
    return entries

@router.post("/", response_model=LogBook)
def create_logbook_entry(req: LogBookCreate, session: Session = Depends(get_db)):
    entry = LogBook(content=req.content, created_by=req.created_by)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@router.put("/{entry_id}", response_model=LogBook)
def update_logbook_entry(entry_id: int, req: LogBookUpdate, session: Session = Depends(get_db)):
    entry = session.get(LogBook, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.content = req.content
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry

@router.delete("/{entry_id}")
def delete_logbook_entry(entry_id: int, session: Session = Depends(get_db)):
    entry = session.get(LogBook, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"message": "Entry deleted successfully"}
