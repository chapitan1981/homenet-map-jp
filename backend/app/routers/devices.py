from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("", response_model=List[schemas.Device])
def list_devices(keyword: Optional[str] = None, device_type: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Device)
    if keyword:
        q = q.filter(models.Device.name.contains(keyword))
    if device_type:
        q = q.filter(models.Device.device_type == device_type)
    return q.order_by(models.Device.id.desc()).all()

@router.post("", response_model=schemas.Device)
def create_device(payload: schemas.DeviceCreate, db: Session = Depends(get_db)):
    item = models.Device(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/{device_id}", response_model=schemas.Device)
def get_device(device_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Device).get(device_id)
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")
    return item

@router.put("/{device_id}", response_model=schemas.Device)
def update_device(device_id: int, payload: schemas.DeviceCreate, db: Session = Depends(get_db)):
    item = db.query(models.Device).get(device_id)
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Device).get(device_id)
    if not item:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(item)
    db.commit()
    return {"success": True}
