from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.get("", response_model=List[schemas.Room])
def list_rooms(db: Session = Depends(get_db)):
    return db.query(models.Room).order_by(models.Room.sort_order, models.Room.id).all()

@router.post("", response_model=schemas.Room)
def create_room(payload: schemas.RoomCreate, db: Session = Depends(get_db)):
    item = models.Room(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{room_id}", response_model=schemas.Room)
def update_room(room_id: int, payload: schemas.RoomCreate, db: Session = Depends(get_db)):
    item = db.query(models.Room).get(room_id)
    if not item:
        raise HTTPException(status_code=404, detail="Room not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Room).get(room_id)
    if not item:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(item)
    db.commit()
    return {"success": True}
