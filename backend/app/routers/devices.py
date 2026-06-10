from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/devices", tags=["devices"])


def normalize_device_room_payload_v162(data: dict):
    room_id = data.get("room_id", None)
    location_id = data.get("location_id", None)
    if room_id == "":
        room_id = None
    if location_id == "":
        location_id = None
    if room_id is None and location_id is not None:
        room_id = location_id
    if location_id is None and room_id is not None:
        location_id = room_id
    data["room_id"] = room_id
    data["location_id"] = location_id
    return data


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



def device_to_dict_v163(device, room_id=None, room_name="未設定"):
    return {
        "id": device.id,
        "name": device.name,
        "device_type": getattr(device, "device_type", "") or "device",
        "type": getattr(device, "device_type", "") or "device",
        "vendor": getattr(device, "vendor", "") or "",
        "model": getattr(device, "model", "") or "",
        "os_name": getattr(device, "os_name", "") or "",
        "description": getattr(device, "description", "") or "",
        "icon": getattr(device, "icon", "") or "",
        "room_id": room_id,
        "location_id": room_id,
        "room_name": room_name or "未設定",
    }

@router.get("/with-rooms")
def list_devices_with_rooms_v163(db: Session = Depends(get_db)):
    devices = db.query(models.Device).order_by(models.Device.id.desc()).all()
    out = []
    for d in devices:
        loc = db.query(models.DeviceLocation).filter(models.DeviceLocation.device_id == d.id).first()
        room_id = loc.room_id if loc else None
        room_name = "未設定"
        if room_id:
            room = db.query(models.Room).get(room_id)
            if room:
                room_name = room.name
        out.append(device_to_dict_v163(d, room_id, room_name))
    return out

@router.patch("/{device_id}/room")
def update_device_room_v163(device_id: int, payload: dict, db: Session = Depends(get_db)):
    device = db.query(models.Device).get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    room_id = payload.get("room_id", None)
    if room_id == "":
        room_id = None
    if room_id is not None:
        room_id = int(room_id)

    loc = db.query(models.DeviceLocation).filter(models.DeviceLocation.device_id == device_id).first()

    if room_id is None:
        if loc:
            db.delete(loc)
            db.commit()
        return device_to_dict_v163(device, None, "未設定")

    room = db.query(models.Room).get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not loc:
        loc = models.DeviceLocation(
            device_id=device_id,
            room_id=room_id,
            x_position=0,
            y_position=0,
            rack_id="",
            note="保管部屋/設置部屋"
        )
        db.add(loc)
    else:
        loc.room_id = room_id

    db.commit()
    db.refresh(device)
    return device_to_dict_v163(device, room_id, room.name)

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


