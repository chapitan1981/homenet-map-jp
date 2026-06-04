from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["custom-fields"])
ALLOWED_TYPES = {"text", "textarea", "url", "date", "number"}

@router.get("/devices/{device_id}/custom-fields", response_model=List[schemas.DeviceCustomField])
def list_custom_fields(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DeviceCustomField).filter(
        models.DeviceCustomField.device_id == device_id
    ).order_by(models.DeviceCustomField.sort_order, models.DeviceCustomField.id).all()

@router.post("/devices/{device_id}/custom-fields", response_model=schemas.DeviceCustomField)
def create_custom_field(device_id: int, payload: schemas.DeviceCustomFieldCreate, db: Session = Depends(get_db)):
    if payload.field_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported field type")
    if not payload.field_name.strip():
        raise HTTPException(status_code=400, detail="Field name is required")
    item = models.DeviceCustomField(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/custom-fields/{field_id}", response_model=schemas.DeviceCustomField)
def update_custom_field(field_id: int, payload: schemas.DeviceCustomFieldCreate, db: Session = Depends(get_db)):
    if payload.field_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported field type")
    item = db.query(models.DeviceCustomField).get(field_id)
    if not item:
        raise HTTPException(status_code=404, detail="Custom field not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/custom-fields/{field_id}")
def delete_custom_field(field_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceCustomField).get(field_id)
    if not item:
        raise HTTPException(status_code=404, detail="Custom field not found")
    db.delete(item)
    db.commit()
    return {"success": True}
