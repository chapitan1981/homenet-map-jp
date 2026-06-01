from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["interfaces"])

@router.get("/devices/{device_id}/interfaces", response_model=List[schemas.NetworkInterface])
def list_interfaces(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.NetworkInterface).filter(models.NetworkInterface.device_id == device_id).all()

@router.post("/devices/{device_id}/interfaces", response_model=schemas.NetworkInterface)
def create_interface(device_id: int, payload: schemas.NetworkInterfaceCreate, db: Session = Depends(get_db)):
    item = models.NetworkInterface(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/interfaces/{interface_id}", response_model=schemas.NetworkInterface)
def update_interface(interface_id: int, payload: schemas.NetworkInterfaceCreate, db: Session = Depends(get_db)):
    item = db.query(models.NetworkInterface).get(interface_id)
    if not item:
        raise HTTPException(status_code=404, detail="Interface not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/interfaces/{interface_id}")
def delete_interface(interface_id: int, db: Session = Depends(get_db)):
    item = db.query(models.NetworkInterface).get(interface_id)
    if not item:
        raise HTTPException(status_code=404, detail="Interface not found")
    db.delete(item)
    db.commit()
    return {"success": True}
