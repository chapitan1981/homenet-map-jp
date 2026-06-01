from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["tags"])

@router.get("/devices/{device_id}/tags", response_model=List[schemas.DeviceTag])
def list_tags(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DeviceTag).filter(models.DeviceTag.device_id == device_id).order_by(models.DeviceTag.id).all()

@router.post("/devices/{device_id}/tags", response_model=schemas.DeviceTag)
def create_tag(device_id: int, payload: schemas.DeviceTagCreate, db: Session = Depends(get_db)):
    name = payload.tag_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name is required")
    exists = db.query(models.DeviceTag).filter(models.DeviceTag.device_id == device_id, models.DeviceTag.tag_name == name).first()
    if exists:
        return exists
    item = models.DeviceTag(device_id=device_id, tag_name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceTag).get(tag_id)
    if not item:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(item)
    db.commit()
    return {"success": True}
