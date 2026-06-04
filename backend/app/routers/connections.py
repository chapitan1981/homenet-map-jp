from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/connections", tags=["connections"])

@router.get("", response_model=List[schemas.DeviceConnection])
def list_connections(db: Session = Depends(get_db)):
    return db.query(models.DeviceConnection).order_by(
        models.DeviceConnection.sort_order,
        models.DeviceConnection.id
    ).all()

@router.post("", response_model=schemas.DeviceConnection)
def create_connection(payload: schemas.DeviceConnectionCreate, db: Session = Depends(get_db)):
    if payload.source_device_id == payload.target_device_id:
        raise HTTPException(status_code=400, detail="Source and target cannot be same")
    source = db.query(models.Device).get(payload.source_device_id)
    target = db.query(models.Device).get(payload.target_device_id)
    if not source or not target:
        raise HTTPException(status_code=404, detail="Source or target device not found")
    item = models.DeviceConnection(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{connection_id}", response_model=schemas.DeviceConnection)
def update_connection(connection_id: int, payload: schemas.DeviceConnectionCreate, db: Session = Depends(get_db)):
    if payload.source_device_id == payload.target_device_id:
        raise HTTPException(status_code=400, detail="Source and target cannot be same")
    item = db.query(models.DeviceConnection).get(connection_id)
    if not item:
        raise HTTPException(status_code=404, detail="Connection not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceConnection).get(connection_id)
    if not item:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(item)
    db.commit()
    return {"success": True}
