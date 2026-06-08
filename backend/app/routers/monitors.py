from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timezone
import subprocess
import time
import urllib.request
import socket
from ..database import get_db, engine
from .. import models, schemas

router = APIRouter(tags=["monitors"])

CREATE_MONITOR_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS device_monitors (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    monitor_type VARCHAR DEFAULT 'ping',
    target VARCHAR NOT NULL,
    name VARCHAR DEFAULT '',
    enabled BOOLEAN DEFAULT 1,
    status VARCHAR DEFAULT 'unknown',
    response_ms INTEGER DEFAULT 0,
    last_checked_at DATETIME,
    last_error TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(device_id) REFERENCES devices(id)
)
"""

def init_monitor_table():
    with engine.begin() as conn:
        conn.execute(text(CREATE_MONITOR_TABLE_SQL))

def ensure_monitor_table(db: Session):
    db.execute(text(CREATE_MONITOR_TABLE_SQL))
    db.commit()

def docker_client():
    try:
        import docker
    except Exception as e:
        raise RuntimeError(f"Docker SDK is not installed: {e}")
    try:
        client = docker.DockerClient(base_url="unix://var/run/docker.sock", timeout=4)
        client.ping()
        return client
    except Exception as e:
        raise RuntimeError(f"Docker socket access failed: {e}")

def list_docker_containers():
    client = docker_client()
    result = []
    for c in client.containers.list(all=True):
        attrs = c.attrs or {}
        state_obj = attrs.get("State", {}) or {}
        state = state_obj.get("Status") or c.status or "unknown"
        ports = attrs.get("NetworkSettings", {}).get("Ports", {}) or {}
        result.append({
            "id": c.short_id,
            "name": c.name,
            "image": ", ".join(c.image.tags) if c.image and c.image.tags else attrs.get("Config", {}).get("Image", ""),
            "state": state,
            "status": c.status or state,
            "ports": ports,
        })
    return result

def run_docker(target: str):
    start = time.time()
    try:
        target_lower = target.lower().strip().lstrip("/")
        for c in list_docker_containers():
            name = (c.get("name") or "").lower()
            cid = (c.get("id") or "").lower()
            image = (c.get("image") or "").lower()
            if target_lower == name or target_lower == cid or target_lower in image:
                ms = int((time.time() - start) * 1000)
                state = c.get("state", "")
                status = c.get("status", "")
                if state == "running":
                    return ("online", ms, status)
                return ("offline", ms, status or state)
        return ("offline", 0, "container not found")
    except Exception as e:
        return ("error", 0, str(e))

def run_tcp(target: str):
    start = time.time()
    try:
        if ":" not in target:
            return ("error", 0, "TCP target must be host:port")
        host, port_text = target.rsplit(":", 1)
        port = int(port_text)
        with socket.create_connection((host, port), timeout=3):
            return ("online", int((time.time() - start) * 1000), "")
    except Exception as e:
        return ("offline", 0, str(e))

def run_ping(target: str):
    start = time.time()
    try:
        result = subprocess.run(["ping", "-c", "1", "-W", "2", target], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=4)
        ms = int((time.time() - start) * 1000)
        return ("online" if result.returncode == 0 else "offline", ms, "" if result.returncode == 0 else "ping failed")
    except Exception as e:
        return ("error", 0, str(e))

def run_http(target: str):
    start = time.time()
    try:
        req = urllib.request.Request(target, headers={"User-Agent":"HomeNetMapJP/0.6.9"})
        with urllib.request.urlopen(req, timeout=5) as res:
            ms = int((time.time() - start) * 1000)
            return ("online" if 200 <= res.status < 400 else "offline", ms, f"HTTP {res.status}")
    except Exception as e:
        return ("error", 0, str(e))

def check_monitor(m: models.DeviceMonitor):
    if not m.enabled:
        return ("disabled", 0, "")
    if m.monitor_type == "http":
        return run_http(m.target)
    if m.monitor_type == "tcp":
        return run_tcp(m.target)
    if m.monitor_type == "docker":
        return run_docker(m.target)
    return run_ping(m.target)

@router.get("/docker/containers")
def docker_containers():
    try:
        return list_docker_containers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



def classify_container(name: str, image: str):
    text = f"{name} {image}".lower()
    rules = [
        ("media", ["jellyfin", "kavita", "plex"]),
        ("photo", ["immich"]),
        ("cloud", ["nextcloud", "cloudflared"]),
        ("dashboard", ["homepage", "portainer", "uptime-kuma", "wud", "glances"]),
        ("document", ["paperless", "stirling", "ocr"]),
        ("automation", ["n8n"]),
        ("database", ["postgres", "mariadb", "mysql", "redis", "valkey"]),
        ("proxy", ["nginx", "proxy"]),
        ("app", ["driveshelf", "wallos", "roundcube", "searxng"]),
    ]
    for category, words in rules:
        if any(w in text for w in words):
            return category
    return "other"

def container_priority(name: str, image: str):
    text = f"{name} {image}".lower()
    important = ["jellyfin", "nextcloud", "immich", "homepage", "portainer", "kavita", "paperless", "stirling", "uptime-kuma", "glances", "n8n"]
    return 1 if any(w in text for w in important) else 9

@router.get("/docker/health")
def docker_health():
    try:
        containers = list_docker_containers()
        total = len(containers)
        running = len([c for c in containers if c.get("state") == "running"])
        stopped = total - running
        categories = {}
        enriched = []
        for c in containers:
            cat = classify_container(c.get("name",""), c.get("image",""))
            categories[cat] = categories.get(cat, 0) + 1
            enriched.append({
                **c,
                "category": cat,
                "priority": container_priority(c.get("name",""), c.get("image","")),
                "healthy": c.get("state") == "running",
            })
        enriched.sort(key=lambda x: (x["priority"], 0 if x.get("state") == "running" else -1, x.get("name","")))
        return {
            "total": total,
            "running": running,
            "stopped": stopped,
            "health_rate": round((running / total) * 100) if total else 0,
            "categories": categories,
            "containers": enriched,
            "stopped_containers": [c for c in enriched if c.get("state") != "running"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/docker/register-monitors/{device_id}")
def register_docker_monitors(device_id: int, db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    if not db.query(models.Device).get(device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    containers = list_docker_containers()
    created = 0
    skipped = 0
    for c in containers:
        name = c.get("name")
        if not name:
            continue
        exists = db.query(models.DeviceMonitor).filter(
            models.DeviceMonitor.device_id == device_id,
            models.DeviceMonitor.monitor_type == "docker",
            models.DeviceMonitor.target == name
        ).first()
        if exists:
            skipped += 1
            continue
        item = models.DeviceMonitor(
            device_id=device_id,
            monitor_type="docker",
            target=name,
            name=f"Docker: {name}",
            enabled=True,
            note=f"Auto registered from Docker container. image={c.get('image','')}"
        )
        db.add(item)
        created += 1
    db.commit()
    return {"created": created, "skipped": skipped, "total": len(containers)}

@router.get("/devices/{device_id}/monitors", response_model=List[schemas.DeviceMonitor])
def list_device_monitors(device_id: int, db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    return db.query(models.DeviceMonitor).filter(models.DeviceMonitor.device_id == device_id).order_by(models.DeviceMonitor.id).all()

@router.get("/monitors", response_model=List[schemas.DeviceMonitor])
def list_all_monitors(db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    return db.query(models.DeviceMonitor).order_by(models.DeviceMonitor.id).all()

@router.post("/devices/{device_id}/monitors", response_model=schemas.DeviceMonitor)
def create_monitor(device_id: int, payload: schemas.DeviceMonitorCreate, db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    if payload.monitor_type not in {"ping","http","tcp","docker"}:
        raise HTTPException(status_code=400, detail="monitor_type must be ping, http, tcp, or docker")
    if not db.query(models.Device).get(device_id):
        raise HTTPException(status_code=404, detail="Device not found")
    item = models.DeviceMonitor(device_id=device_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/monitors/{monitor_id}", response_model=schemas.DeviceMonitor)
def update_monitor(monitor_id: int, payload: schemas.DeviceMonitorCreate, db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    if payload.monitor_type not in {"ping","http","tcp","docker"}:
        raise HTTPException(status_code=400, detail="monitor_type must be ping, http, tcp, or docker")
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
    ensure_monitor_table(db)
    item = db.query(models.DeviceMonitor).get(monitor_id)
    if not item:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(item)
    db.commit()
    return {"success": True}

@router.post("/monitors/{monitor_id}/check", response_model=schemas.DeviceMonitor)
def check_one_monitor(monitor_id: int, db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    item = db.query(models.DeviceMonitor).get(monitor_id)
    if not item:
        raise HTTPException(status_code=404, detail="Monitor not found")
    status, ms, err = check_monitor(item)
    item.status, item.response_ms, item.last_error = status, ms, err
    item.last_checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item

@router.post("/monitors/check-all")
def check_all_monitors(db: Session = Depends(get_db)):
    ensure_monitor_table(db)
    items = db.query(models.DeviceMonitor).filter(models.DeviceMonitor.enabled == True).all()
    results = []
    for item in items:
        status, ms, err = check_monitor(item)
        item.status, item.response_ms, item.last_error = status, ms, err
        item.last_checked_at = datetime.now(timezone.utc)
        results.append({"id": item.id, "status": status, "response_ms": ms})
    db.commit()
    return {"checked": len(results), "results": results}
