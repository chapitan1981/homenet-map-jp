from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["photos"])
UPLOAD_DIR = Path("/app/app/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

def save_upload(file: UploadFile, prefix: str):
    original = file.filename or "upload"
    ext = Path(original).suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    name = f"{prefix}_{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / name
    with dest.open("wb") as f:
        f.write(file.file.read())
    return original, f"/uploads/{name}"

@router.get("/devices/{device_id}/photos", response_model=List[schemas.DevicePhoto])
def list_device_photos(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DevicePhoto).filter(models.DevicePhoto.device_id == device_id).order_by(models.DevicePhoto.id.desc()).all()

@router.post("/devices/{device_id}/photos", response_model=schemas.DevicePhoto)
def upload_device_photo(device_id: int, photo_type: str = Form("front"), note: str = Form(""), file: UploadFile = File(...), db: Session = Depends(get_db)):
    original, path = save_upload(file, f"device_{device_id}")
    item = models.DevicePhoto(device_id=device_id, photo_type=photo_type, file_name=original, file_path=path, note=note)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.delete("/device-photos/{photo_id}")
def delete_device_photo(photo_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DevicePhoto).get(photo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")
    p = UPLOAD_DIR / Path(item.file_path).name
    if p.exists():
        p.unlink()
    db.delete(item); db.commit()
    return {"success": True}

@router.get("/rooms/{room_id}/photos", response_model=List[schemas.RoomPhoto])
def list_room_photos(room_id: int, db: Session = Depends(get_db)):
    return db.query(models.RoomPhoto).filter(models.RoomPhoto.room_id == room_id).order_by(models.RoomPhoto.id.desc()).all()

@router.post("/rooms/{room_id}/photos", response_model=schemas.RoomPhoto)
def upload_room_photo(room_id: int, photo_type: str = Form("background"), note: str = Form(""), file: UploadFile = File(...), db: Session = Depends(get_db)):
    original, path = save_upload(file, f"room_{room_id}")
    item = models.RoomPhoto(room_id=room_id, photo_type=photo_type, file_name=original, file_path=path, note=note)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.delete("/room-photos/{photo_id}")
def delete_room_photo(photo_id: int, db: Session = Depends(get_db)):
    item = db.query(models.RoomPhoto).get(photo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Photo not found")
    p = UPLOAD_DIR / Path(item.file_path).name
    if p.exists():
        p.unlink()
    db.delete(item); db.commit()
    return {"success": True}
