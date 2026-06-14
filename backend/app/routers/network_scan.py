from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import ipaddress
import socket
import subprocess
import concurrent.futures
import platform
from typing import Optional

from app.database import get_db
from app import models

router = APIRouter(prefix="/network-scan", tags=["network-scan"])


class ScanRequest(BaseModel):
    cidr: str = "192.168.0.0/24"
    tcp_ports: str = "22,80,443,8000,8080,8081,8123,3880,3881"
    timeout_ms: int = 700
    max_hosts: int = 256


class AddDeviceRequest(BaseModel):
    name: str
    ip_address: str
    device_type: str = "network"
    icon: str = "network"
    note: Optional[str] = ""


def ping_host(ip: str, timeout_ms: int) -> bool:
    try:
        system = platform.system().lower()
        if "windows" in system:
            cmd = ["ping", "-n", "1", "-w", str(timeout_ms), ip]
        else:
            timeout_s = max(1, int(timeout_ms / 1000))
            cmd = ["ping", "-c", "1", "-W", str(timeout_s), ip]
        r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=max(1, int(timeout_ms/1000)+1))
        return r.returncode == 0
    except Exception:
        return False


def tcp_check(ip: str, port: int, timeout_ms: int) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=max(0.2, timeout_ms / 1000)):
            return True
    except Exception:
        return False


def reverse_dns(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def scan_one(ip: str, ports: list[int], timeout_ms: int) -> dict:
    open_ports = []
    ping_ok = ping_host(ip, timeout_ms)
    for p in ports:
        if tcp_check(ip, p, timeout_ms):
            open_ports.append(p)
    online = ping_ok or bool(open_ports)
    return {
        "ip": ip,
        "online": online,
        "ping": ping_ok,
        "open_ports": open_ports,
        "hostname": reverse_dns(ip) if online else "",
    }


@router.post("")
def scan_network(req: ScanRequest, db: Session = Depends(get_db)):
    try:
        net = ipaddress.ip_network(req.cidr, strict=False)
    except Exception:
        raise HTTPException(status_code=400, detail="CIDR形式が不正です。例: 192.168.0.0/24")

    hosts = list(net.hosts())
    if len(hosts) > req.max_hosts:
        raise HTTPException(status_code=400, detail=f"スキャン対象が多すぎます。最大 {req.max_hosts} ホストまでです。")

    ports = []
    for x in req.tcp_ports.split(","):
        x = x.strip()
        if not x:
            continue
        try:
            p = int(x)
            if 1 <= p <= 65535:
                ports.append(p)
        except Exception:
            pass

    existing_devices = db.query(models.Device).all()
    existing_names = {getattr(d, "name", "") for d in existing_devices}
    existing_ips = set()

    for d in existing_devices:
        desc = getattr(d, "description", "") or ""
        for token in desc.replace(",", " ").replace("\\n", " ").split():
            try:
                ipaddress.ip_address(token)
                existing_ips.add(token)
            except Exception:
                pass

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
        futs = [ex.submit(scan_one, str(ip), ports, req.timeout_ms) for ip in hosts]
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            if r["online"]:
                suggested_name = r["hostname"] or f"device-{r['ip'].replace('.', '-')}"
                r["registered"] = r["ip"] in existing_ips or suggested_name in existing_names
                r["suggested_name"] = suggested_name
                results.append(r)

    results.sort(key=lambda x: tuple(int(n) for n in x["ip"].split(".")))
    return {
        "cidr": str(net),
        "count": len(results),
        "results": results,
    }


@router.post("/add-device")
def add_scanned_device(req: AddDeviceRequest, db: Session = Depends(get_db)):
    name = req.name.strip() or req.ip_address
    exists = db.query(models.Device).filter(models.Device.name == name).first()
    if exists:
        raise HTTPException(status_code=409, detail="同名の機器が既に存在します。")

    desc = f"Network scan detected IP: {req.ip_address}"
    if req.note:
        desc += f"\\n{req.note}"

    device = models.Device(
        name=name,
        device_type=req.device_type or "network",
        vendor="",
        model="",
        os_name="",
        description=desc,
        icon=req.icon or "network",
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device
