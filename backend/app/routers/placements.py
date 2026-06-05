from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/placements", tags=["placements"])

@router.get("", response_model=List[schemas.RoomDevicePlacement])
def list_placements(room_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.RoomDevicePlacement)
    if room_id is not None:
        q = q.filter(models.RoomDevicePlacement.room_id == room_id)
    return q.order_by(models.RoomDevicePlacement.id).all()

@router.post("", response_model=schemas.RoomDevicePlacement)
def create_placement(payload: schemas.RoomDevicePlacementCreate, db: Session = Depends(get_db)):
    if not db.query(models.Room).get(payload.room_id) or not db.query(models.Device).get(payload.device_id):
        raise HTTPException(status_code=404, detail="Room or device not found")
    item = models.RoomDevicePlacement(**payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.put("/{placement_id}", response_model=schemas.RoomDevicePlacement)
def update_placement(placement_id: int, payload: schemas.RoomDevicePlacementCreate, db: Session = Depends(get_db)):
    item = db.query(models.RoomDevicePlacement).get(placement_id)
    if not item:
        raise HTTPException(status_code=404, detail="Placement not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit(); db.refresh(item)
    return item

@router.delete("/{placement_id}")
def delete_placement(placement_id: int, db: Session = Depends(get_db)):
    item = db.query(models.RoomDevicePlacement).get(placement_id)
    if not item:
        raise HTTPException(status_code=404, detail="Placement not found")
    db.delete(item); db.commit()
    return {"success": True}
