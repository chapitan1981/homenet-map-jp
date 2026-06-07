from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["urls"])

@router.get("/device-urls", response_model=List[schemas.DeviceUrl])
def list_all_device_urls(db: Session = Depends(get_db)):
    return db.query(models.DeviceUrl).order_by(models.DeviceUrl.sort_order, models.DeviceUrl.id).all()

@router.get("/devices/{device_id}/urls", response_model=List[schemas.DeviceUrl])
def list_device_urls(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DeviceUrl).filter(models.DeviceUrl.device_id == device_id).order_by(models.DeviceUrl.sort_order, models.DeviceUrl.id).all()

@router.post("/devices/{device_id}/urls", response_model=schemas.DeviceUrl)
def create_device_url(device_id: int, payload: schemas.DeviceUrlCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if not payload.url.strip():
        raise HTTPException(status_code=400, detail="URL is required")
    device = db.query(models.Device).get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    item = models.DeviceUrl(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/device-urls/{url_id}", response_model=schemas.DeviceUrl)
def update_device_url(url_id: int, payload: schemas.DeviceUrlCreate, db: Session = Depends(get_db)):
    item = db.query(models.DeviceUrl).get(url_id)
    if not item:
        raise HTTPException(status_code=404, detail="URL not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/device-urls/{url_id}")
def delete_device_url(url_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceUrl).get(url_id)
    if not item:
        raise HTTPException(status_code=404, detail="URL not found")
    db.delete(item)
    db.commit()
    return {"success": True}
