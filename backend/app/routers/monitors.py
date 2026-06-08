from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timezone
import subprocess
import time
import urllib.request
import socket
import json
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

DOCKER_SOCK = "/var/run/docker.sock"

def init_monitor_table():
    with engine.begin() as conn:
        conn.execute(text(CREATE_MONITOR_TABLE_SQL))

def ensure_monitor_table(db: Session):
    db.execute(text(CREATE_MONITOR_TABLE_SQL))
    db.commit()

def decode_chunked(body: bytes) -> bytes:
    output = bytearray()
    idx = 0
    while idx < len(body):
        line_end = body.find(b"\\r\\n", idx)
        if line_end == -1:
            break
        size_line = body[idx:line_end].split(b";", 1)[0].strip()
        try:
            size = int(size_line, 16)
        except ValueError:
            return body
        idx = line_end + 2
        if size == 0:
            break
        output.extend(body[idx:idx+size])
        idx += size + 2
    return bytes(output)

def docker_api(path: str):
    req = f"GET {path} HTTP/1.1\\r\\nHost: docker\\r\\nAccept: application/json\\r\\nConnection: close\\r\\n\\r\\n".encode()
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        s.settimeout(5)
        s.connect(DOCKER_SOCK)
        s.sendall(req)
        chunks = []
        while True:
            data = s.recv(65536)
            if not data:
                break
            chunks.append(data)
        raw = b"".join(chunks)
    finally:
        s.close()

    header, sep, body = raw.partition(b"\\r\\n\\r\\n")
    if not sep:
        raise RuntimeError("Invalid Docker API response")

    header_text = header.decode("iso-8859-1", errors="ignore")
    status_line = header_text.splitlines()[0] if header_text else ""
    if " 200 " not in status_line:
        detail = body[:300].decode("utf-8", errors="ignore")
        raise RuntimeError(f"{status_line} {detail}".strip())

    if "transfer-encoding: chunked" in header_text.lower():
        body = decode_chunked(body)

    body_text = body.decode("utf-8", errors="replace").strip()
    if not body_text:
        return []

    try:
        return json.loads(body_text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Docker JSON parse failed: {e}; body head={body_text[:120]!r}")

def list_docker_containers():
    return docker_api("/containers/json?all=1")

def run_docker(target: str):
    start = time.time()
    try:
        target_lower = target.lower().strip().lstrip("/")
        for c in list_docker_containers():
            names = [n.lower().lstrip("/") for n in c.get("Names", [])]
            cid = c.get("Id", "").lower()
            image = c.get("Image", "").lower()
            if target_lower in names or target_lower == cid[:12] or target_lower in image:
                ms = int((time.time() - start) * 1000)
                state = c.get("State", "")
                status = c.get("Status", "")
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
        req = urllib.request.Request(target, headers={"User-Agent":"HomeNetMapJP/0.6.7"})
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
        return [{
            "id": c.get("Id", "")[:12],
            "name": (c.get("Names") or [""])[0].lstrip("/"),
            "image": c.get("Image", ""),
            "state": c.get("State", ""),
            "status": c.get("Status", ""),
            "ports": c.get("Ports", []),
        } for c in list_docker_containers()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
