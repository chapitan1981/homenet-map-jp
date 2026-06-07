from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import subprocess
import time
import urllib.request
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["monitors"])

def run_ping(target: str):
    start = time.time()
    try:
        result = subprocess.run(
            ["ping", "-c", "1", "-W", "2", target],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=4
        )
        ms = int((time.time() - start) * 1000)
        return ("online" if result.returncode == 0 else "offline", ms, "" if result.returncode == 0 else "ping failed")
    except Exception as e:
        return ("error", 0, str(e))

def run_http(target: str):
    start = time.time()
    try:
        req = urllib.request.Request(target, headers={"User-Agent":"HomeNetMapJP/0.6.0"})
        with urllib.request.urlopen(req, timeout=5) as res:
            ms = int((time.time() - start) * 1000)
            ok = 200 <= res.status < 400
            return ("online" if ok else "offline", ms, f"HTTP {res.status}")
    except Exception as e:
        return ("error", 0, str(e))

def check_monitor(m: models.DeviceMonitor):
    if not m.enabled:
        return ("disabled", 0, "")
    if m.monitor_type == "http":
        return run_http(m.target)
    return run_ping(m.target)

@router.get("/devices/{device_id}/monitors", response_model=List[schemas.DeviceMonitor])
def list_device_monitors(device_id: int, db: Session = Depends(get_db)):
    return db.query(models.DeviceMonitor).filter(models.DeviceMonitor.device_id == device_id).order_by(models.DeviceMonitor.id).all()

@router.get("/monitors", response_model=List[schemas.DeviceMonitor])
def list_all_monitors(db: Session = Depends(get_db)):
    return db.query(models.DeviceMonitor).order_by(models.DeviceMonitor.id).all()

@router.post("/devices/{device_id}/monitors", response_model=schemas.DeviceMonitor)
def create_monitor(device_id: int, payload: schemas.DeviceMonitorCreate, db: Session = Depends(get_db)):
    if payload.monitor_type not in {"ping","http"}:
        raise HTTPException(status_code=400, detail="monitor_type must be ping or http")
    if not db.query(models.Device).get(device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    item = models.DeviceMonitor(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/monitors/{monitor_id}", response_model=schemas.DeviceMonitor)
def update_monitor(monitor_id: int, payload: schemas.DeviceMonitorCreate, db: Session = Depends(get_db)):
    item = db.query(models.DeviceMonitor).get(monitor_id)
    if not item:
        raise HTTPException(status_code=404, detail="Monitor not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/monitors/{monitor_id}")
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceMonitor).get(monitor_id)
    if not item:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(item)
    db.commit()
    return {"success": True}

@router.post("/monitors/{monitor_id}/check", response_model=schemas.DeviceMonitor)
def check_one_monitor(monitor_id: int, db: Session = Depends(get_db)):
    item = db.query(models.DeviceMonitor).get(monitor_id)
    if not item:
        raise HTTPException(status_code=404, detail="Monitor not found")
    status, ms, err = check_monitor(item)
    item.status = status
    item.response_ms = ms
    item.last_error = err
    item.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item

@router.post("/monitors/check-all")
def check_all_monitors(db: Session = Depends(get_db)):
    items = db.query(models.DeviceMonitor).filter(models.DeviceMonitor.enabled == True).all()
    results = []
    for item in items:
        status, ms, err = check_monitor(item)
        item.status = status
        item.response_ms = ms
        item.last_error = err
        item.last_checked_at = datetime.now(timezone.utc)
        results.append({"id": item.id, "status": status, "response_ms": ms})
    db.commit()
    return {"checked": len(results), "results": results}
