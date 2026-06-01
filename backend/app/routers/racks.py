from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/racks", tags=["racks"])

@router.get("", response_model=List[schemas.Rack])
def list_racks(db: Session = Depends(get_db)):
    return db.query(models.Rack).order_by(models.Rack.id.desc()).all()

@router.post("", response_model=schemas.Rack)
def create_rack(payload: schemas.RackCreate, db: Session = Depends(get_db)):
    item = models.Rack(**payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.delete("/{rack_id}")
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Rack).get(rack_id)
    if not item:
        raise HTTPException(status_code=404, detail="Rack not found")
    db.delete(item); db.commit()
    return {"success": True}

@router.get("/{rack_id}/items", response_model=List[schemas.RackItem])
def list_rack_items(rack_id: int, db: Session = Depends(get_db)):
    return db.query(models.RackItem).filter(models.RackItem.rack_id == rack_id).order_by(models.RackItem.start_unit.desc()).all()

@router.post("/{rack_id}/items", response_model=schemas.RackItem)
def create_rack_item(rack_id: int, payload: schemas.RackItemCreate, db: Session = Depends(get_db)):
    item = models.RackItem(rack_id=rack_id, **payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.delete("/items/{item_id}")
def delete_rack_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.RackItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Rack item not found")
    db.delete(item); db.commit()
    return {"success": True}
