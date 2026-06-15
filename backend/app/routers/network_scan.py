from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import ipaddress, socket, subprocess, concurrent.futures, platform, re
from typing import Optional
from app.database import get_db
from app import models

router = APIRouter(prefix="/network-scan", tags=["network-scan"])

MAC_RE = re.compile(r"([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}")
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

OUI_HINTS = {
    "b8:27:eb": "Raspberry Pi", "dc:a6:32": "Raspberry Pi", "e4:5f:01": "Raspberry Pi",
    "52:54:00": "QEMU/KVM", "bc:24:11": "Proxmox/QEMU", "02:42": "Docker",
    "00:15:5d": "Hyper-V", "00:50:56": "VMware", "00:0c:29": "VMware",
    "00:11:32": "Synology", "00:1d:0f": "QNAP", "24:5e:be": "QNAP",
    "00:25:90": "Supermicro", "ac:1f:6b": "Supermicro",
    "f8:b1:56": "Intel", "a0:36:9f": "Intel", "00:1b:21": "Intel",
    "00:e0:4c": "Realtek", "ec:fa:bc": "TP-Link", "50:c7:bf": "TP-Link",
    "f4:f2:6d": "TP-Link", "c0:25:e9": "TP-Link", "74:da:88": "TP-Link",
    "cc:2d:e0": "Xiaomi", "64:cc:22": "Xiaomi", "28:6c:07": "Xiaomi",
    "3c:7c:3f": "Apple", "f0:18:98": "Apple", "a4:83:e7": "Apple",
}
PORT_HINTS = {
    22: "SSH", 53: "DNS", 80: "HTTP", 139: "NetBIOS", 443: "HTTPS", 445: "SMB",
    5000: "NAS/Web候補", 5001: "NAS HTTPS候補", 8006: "Proxmox",
    8080: "HTTP-alt", 8081: "HTTP-alt", 8123: "Home Assistant",
    32400: "Plex", 3880: "HomeNet Map UI", 3881: "HomeNet Map API",
}

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

def normalize_mac(mac: str) -> str:
    return (mac or "").lower().replace("-", ":")

def vendor_from_mac(mac: str) -> str:
    m = normalize_mac(mac)
    for prefix, vendor in OUI_HINTS.items():
        if m.startswith(prefix):
            return vendor
    return ""

def read_arp_table() -> dict[str, str]:
    arp = {}
    try:
        with open("/proc/net/arp", "r", encoding="utf-8", errors="ignore") as f:
            for line in f.readlines()[1:]:
                parts = line.split()
                if len(parts) >= 4 and MAC_RE.fullmatch(parts[3]):
                    arp[parts[0]] = normalize_mac(parts[3])
    except Exception:
        pass
    for cmd in (["ip", "neigh"], ["arp", "-an"]):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
            for line in r.stdout.splitlines():
                ip = IP_RE.search(line)
                mac = MAC_RE.search(line)
                if ip and mac:
                    arp[ip.group(0)] = normalize_mac(mac.group(0))
        except Exception:
            pass
    return arp

def ping_host(ip: str, timeout_ms: int) -> bool:
    try:
        if "windows" in platform.system().lower():
            cmd = ["ping", "-n", "1", "-w", str(timeout_ms), ip]
            run_timeout = max(1, timeout_ms / 1000 + 0.5)
        else:
            cmd = ["ping", "-c", "1", "-W", "1", ip]
            run_timeout = max(0.4, timeout_ms / 1000 + 0.4)
        return subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=run_timeout).returncode == 0
    except Exception:
        return False

def tcp_check(ip: str, port: int, timeout_ms: int) -> bool:
    try:
        with socket.create_connection((ip, port), timeout=max(0.1, timeout_ms / 1000)):
            return True
    except Exception:
        return False

def reverse_dns(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""

def scan_one(ip: str, ports: list[int], timeout_ms: int, do_ping: bool) -> dict:
    open_ports = [p for p in ports if tcp_check(ip, p, timeout_ms)]
    ping_ok = ping_host(ip, timeout_ms) if do_ping else False
    online = ping_ok or bool(open_ports)
    return {
        "ip": ip, "online": online, "ping": ping_ok, "open_ports": open_ports,
        "services": [PORT_HINTS.get(p, str(p)) for p in open_ports],
        "hostname": reverse_dns(ip) if online else "",
    }

def collect_registered_inventory(db: Session):
    devices = db.query(models.Device).all()
    names = {getattr(d, "name", "") for d in devices}
    ips, macs = {}, {}
    for d in devices:
        text = " ".join([str(getattr(d, x, "") or "") for x in ["name", "description", "model", "vendor"]])
        for ip in IP_RE.findall(text):
            ips[ip] = {"id": getattr(d, "id", None), "name": getattr(d, "name", "")}
        for mm in MAC_RE.finditer(text):
            macs[normalize_mac(mm.group(0))] = {"id": getattr(d, "id", None), "name": getattr(d, "name", "")}
    for model_name in ["NetworkInterface", "Interface", "DeviceInterface"]:
        model = getattr(models, model_name, None)
        if not model:
            continue
        try:
            for row in db.query(model).all():
                ip = getattr(row, "ip_address", None) or getattr(row, "ipv4", None) or getattr(row, "address", None)
                mac = getattr(row, "mac_address", None) or getattr(row, "mac", None)
                device_id = getattr(row, "device_id", None)
                dev_name = ""
                if device_id:
                    dev = db.query(models.Device).filter(models.Device.id == device_id).first()
                    if dev:
                        dev_name = getattr(dev, "name", "") or ""
                if ip:
                    ips[str(ip)] = {"id": device_id, "name": dev_name}
                if mac:
                    macs[normalize_mac(str(mac))] = {"id": device_id, "name": dev_name}
        except Exception:
            pass
    return names, ips, macs

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
        try:
            p = int(x.strip())
            if 1 <= p <= 65535:
                ports.append(p)
        except Exception:
            pass
    if len(ports) > 12:
        raise HTTPException(status_code=400, detail="TCPポート数が多すぎます。12個以下にしてください。")

    existing_names, existing_ips, existing_macs = collect_registered_inventory(db)
    max_workers = min(128, max(16, len(hosts)))
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as ex:
        futs = [ex.submit(scan_one, str(ip), ports, req.timeout_ms, req.ping) for ip in hosts]
        for fut in concurrent.futures.as_completed(futs):
            r = fut.result()
            if r["online"]:
                results.append(r)

    arp = read_arp_table()
    for r in results:
        mac = arp.get(r["ip"], "")
        vendor = vendor_from_mac(mac)
        suggested = r["hostname"] or vendor or f"device-{r['ip'].replace('.', '-')}"
        dup_ip = existing_ips.get(r["ip"])
        dup_mac = existing_macs.get(mac) if mac else None
        r["mac_address"] = mac
        r["vendor_hint"] = vendor
        r["service_hint"] = ", ".join(r["services"]) if r["services"] else ""
        r["registered"] = bool(dup_ip or dup_mac or suggested in existing_names)
        r["duplicate_reason"] = "IP重複" if dup_ip else ("MAC重複" if dup_mac else ("名称重複" if suggested in existing_names else ""))
        r["registered_device"] = dup_ip or dup_mac or None
        r["suggested_name"] = suggested

    results.sort(key=lambda x: tuple(int(n) for n in x["ip"].split(".")))
    return {"cidr": str(net), "count": len(results), "results": results}

@router.post("/add-device")
def add_scanned_device(req: AddDeviceRequest, db: Session = Depends(get_db)):
    name = req.name.strip() or req.ip_address
    if db.query(models.Device).filter(models.Device.name == name).first():
        raise HTTPException(status_code=409, detail="同名の機器が既に存在します。")
    _, existing_ips, existing_macs = collect_registered_inventory(db)
    if req.ip_address in existing_ips:
        t = existing_ips[req.ip_address]
        raise HTTPException(status_code=409, detail=f"このIPは既に登録済みです: {t.get('name') or t.get('id')}")
    note = req.note or ""
    mm = MAC_RE.search(note)
    if mm:
        mac = normalize_mac(mm.group(0))
        if mac in existing_macs:
            t = existing_macs[mac]
            raise HTTPException(status_code=409, detail=f"このMACアドレスは既に登録済みです: {t.get('name') or t.get('id')}")
    desc = f"Network scan detected IP: {req.ip_address}"
    if note:
        desc += f"\\n{note}"
    device = models.Device(
        name=name, device_type=req.device_type or "network",
        vendor="", model="", os_name="", description=desc, icon=req.icon or "network"
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device
