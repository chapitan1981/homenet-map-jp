from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path
import ipaddress, json, re
from typing import Optional
from app.database import get_db
from app import models

router = APIRouter(prefix="/network-scan", tags=["network-scan"])
RESULT_FILE = Path("/app/app/data/network_scan_result.json")
MAC_RE = re.compile(r"([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}")
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

class ScanRequest(BaseModel):
    cidr: str = "192.168.0.0/24"
    tcp_ports: str = "22,80,443,445,8006,8123,3880,3881"
    timeout_ms: int = 300
    max_hosts: int = 256
    ping: bool = True

class AddDeviceRequest(BaseModel):
    name: str
    ip_address: str
    device_type: str = "network"
    icon: str = "network"
    note: Optional[str] = ""

def norm_mac(m: str) -> str:
    return (m or "").lower().replace("-", ":")

def collect_registered_inventory(db: Session):
    devices = db.query(models.Device).all()
    names={getattr(d,"name","") for d in devices}
    ips,macs={},{}
    for d in devices:
        text=" ".join([str(getattr(d,x,"") or "") for x in ["name","description","model","vendor"]])
        for ip in IP_RE.findall(text): ips[ip]={"id":getattr(d,"id",None),"name":getattr(d,"name","")}
        for mm in MAC_RE.finditer(text): macs[norm_mac(mm.group(0))]={"id":getattr(d,"id",None),"name":getattr(d,"name","")}
    return names,ips,macs

def mark_registered(data: dict, db: Session) -> dict:
    names,ips,macs=collect_registered_inventory(db)
    for r in data.get("results",[]):
        mac=norm_mac(r.get("mac_address",""))
        suggested=r.get("suggested_name") or r.get("hostname") or r.get("ip")
        dup_ip=ips.get(r.get("ip",""))
        dup_mac=macs.get(mac) if mac else None
        r["registered"]=bool(dup_ip or dup_mac or suggested in names)
        r["duplicate_reason"]="IP重複" if dup_ip else ("MAC重複" if dup_mac else ("名称重複" if suggested in names else ""))
        r["registered_device"]=dup_ip or dup_mac or None
    return data

def read_result_or_empty(db: Session):
    if not RESULT_FILE.exists():
        return {"source":"true-host-script","script_context":"not-run-yet","count":0,"mac_count":0,"arp_count":0,"results":[],"message":"まだUbuntuホスト側スキャン結果がありません。Ubuntuで scripts/host_network_scan.py を実行してください。"}
    return mark_registered(json.loads(RESULT_FILE.read_text(encoding="utf-8")), db)

@router.post("")
def scan_network(req: ScanRequest, db: Session = Depends(get_db)):
    try: ipaddress.ip_network(req.cidr, strict=False)
    except Exception: raise HTTPException(status_code=400, detail="CIDR形式が不正です。例: 192.168.0.0/24")
    return read_result_or_empty(db)

@router.get("/last-result")
def last_result(db: Session = Depends(get_db)):
    return read_result_or_empty(db)

@router.get("/host-command")
def host_command():
    return {"manual_command":"cd ~/homenet-map-jp && python3 scripts/host_network_scan.py --cidr 192.168.0.0/24 --out backend/app/data/network_scan_result.json","cron_example":"*/10 * * * * cd /home/yuta/homenet-map-jp && /usr/bin/python3 scripts/host_network_scan.py --cidr 192.168.0.0/24 --out backend/app/data/network_scan_result.json >/tmp/homenet-map-scan.log 2>&1","note":"Dockerコンテナ内ではなくUbuntuホストで実行してください。"}

@router.post("/add-device")
def add_scanned_device(req: AddDeviceRequest, db: Session = Depends(get_db)):
    name=req.name.strip() or req.ip_address
    if db.query(models.Device).filter(models.Device.name==name).first(): raise HTTPException(status_code=409, detail="同名の機器が既に存在します。")
    _,ips,macs=collect_registered_inventory(db)
    if req.ip_address in ips:
        t=ips[req.ip_address]; raise HTTPException(status_code=409, detail=f"このIPは既に登録済みです: {t.get('name') or t.get('id')}")
    note=req.note or ""
    mm=MAC_RE.search(note)
    if mm:
        mac=norm_mac(mm.group(0))
        if mac in macs:
            t=macs[mac]; raise HTTPException(status_code=409, detail=f"このMACアドレスは既に登録済みです: {t.get('name') or t.get('id')}")
    desc=f"Network scan detected IP: {req.ip_address}"
    if note: desc += f"\n{note}"
    device=models.Device(name=name,device_type=req.device_type or "network",vendor="",model="",os_name="",description=desc,icon=req.icon or "network")
    db.add(device); db.commit(); db.refresh(device)
    return device
