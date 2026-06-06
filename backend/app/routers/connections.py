from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/connections", tags=["connections"])

def ensure_connection_columns(db: Session):
    rows = db.execute(text("PRAGMA table_info(device_connections)")).fetchall()
    existing = {r[1] for r in rows}
    additions = {
        "source_port": "TEXT DEFAULT ''",
        "target_port": "TEXT DEFAULT ''",
        "speed": "TEXT DEFAULT ''",
        "cable_type": "TEXT DEFAULT ''",
    }
    changed = False
    for name, ddl in additions.items():
        if name not in existing:
            db.execute(text(f"ALTER TABLE device_connections ADD COLUMN {name} {ddl}"))
            changed = True
    if changed:
        db.commit()

@router.get("", response_model=List[schemas.DeviceConnection])
def list_connections(db: Session = Depends(get_db)):
    ensure_connection_columns(db)
    return db.query(models.DeviceConnection).order_by(models.DeviceConnection.sort_order, models.DeviceConnection.id).all()

@router.post("", response_model=schemas.DeviceConnection)
def create_connection(payload: schemas.DeviceConnectionCreate, db: Session = Depends(get_db)):
    ensure_connection_columns(db)
    if payload.source_device_id == payload.target_device_id:
        raise HTTPException(status_code=400, detail="Source and target cannot be same")
    if not db.query(models.Device).get(payload.source_device_id) or not db.query(models.Device).get(payload.target_device_id):
        raise HTTPException(status_code=404, detail="Source or target device not found")
    item = models.DeviceConnection(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{connection_id}", response_model=schemas.DeviceConnection)
def update_connection(connection_id: int, payload: schemas.DeviceConnectionCreate, db: Session = Depends(get_db)):
    ensure_connection_columns(db)
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
    ensure_connection_columns(db)
    item = db.query(models.DeviceConnection).get(connection_id)
    if not item:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(item)
    db.commit()
    return {"success": True}
