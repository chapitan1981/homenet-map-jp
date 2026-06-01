from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["parts"])

@router.get("/devices/{device_id}/parts", response_model=List[schemas.DevicePart])
def list_parts(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DevicePart).filter(models.DevicePart.device_id == device_id).all()

@router.post("/devices/{device_id}/parts", response_model=schemas.DevicePart)
def create_part(device_id: int, payload: schemas.DevicePartCreate, db: Session = Depends(get_db)):
    item = models.DevicePart(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/parts/{part_id}", response_model=schemas.DevicePart)
def update_part(part_id: int, payload: schemas.DevicePartCreate, db: Session = Depends(get_db)):
    item = db.query(models.DevicePart).get(part_id)
    if not item:
        raise HTTPException(status_code=404, detail="Part not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/parts/{part_id}")
def delete_part(part_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DevicePart).get(part_id)
    if not item:
        raise HTTPException(status_code=404, detail="Part not found")
    db.delete(item)
    db.commit()
    return {"success": True}
