from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/device-locations", tags=["locations"])

@router.get("", response_model=List[schemas.DeviceLocation])
def list_locations(db: Session = Depends(get_db)):
    return db.query(models.DeviceLocation).all()

@router.post("", response_model=schemas.DeviceLocation)
def create_location(payload: schemas.DeviceLocationCreate, db: Session = Depends(get_db)):
    item = models.DeviceLocation(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{location_id}", response_model=schemas.DeviceLocation)
def update_location(location_id: int, payload: schemas.DeviceLocationCreate, db: Session = Depends(get_db)):
    item = db.query(models.DeviceLocation).get(location_id)
    if not item:
        raise HTTPException(status_code=404, detail="Location not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item
