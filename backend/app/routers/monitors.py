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
from app.timezone_utils import now_jst, to_jst_iso, normalize_datetime_fields

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
    return normalize_datetime_fields({"created": created, "skipped": skipped, "total": len(containers)})



def first_host_port(ports):
    if not ports:
        return None
    if isinstance(ports, dict):
        for _container_port, mappings in ports.items():
            if isinstance(mappings, list) and mappings:
                for m in mappings:
                    hp = m.get("HostPort")
                    if hp:
                        return hp
    return None

def service_url_from_container(c, host="192.168.0.88"):
    port = first_host_port(c.get("ports"))
    if not port:
        return ""
    scheme = "https" if str(port) in {"443", "9443", "8006"} else "http"
    return f"{scheme}://{host}:{port}"

def service_score(name: str, image: str):
    text = f"{name} {image}".lower()
    priority = ["homepage", "jellyfin", "nextcloud", "immich", "portainer", "kavita", "paperless", "stirling", "uptime-kuma", "glances", "n8n", "wud"]
    for i, key in enumerate(priority):
        if key in text:
            return i
    return 99

def host_info():
    import os
    import platform
    import shutil
    info = {
        "hostname": platform.node(),
        "platform": platform.platform(),
        "cpu_count": os.cpu_count(),
        "loadavg": None,
        "memory": {},
        "disk": {},
        "uptime": "",
    }
    try:
        info["loadavg"] = os.getloadavg()
    except Exception:
        pass
    try:
        with open("/proc/meminfo", "r") as f:
            mem = {}
            for line in f:
                k, v = line.split(":", 1)
                mem[k] = int(v.strip().split()[0])
            total = mem.get("MemTotal", 0)
            available = mem.get("MemAvailable", 0)
            used = total - available
            info["memory"] = {
                "total_mb": round(total / 1024),
                "used_mb": round(used / 1024),
                "available_mb": round(available / 1024),
                "used_percent": round((used / total) * 100) if total else 0,
            }
    except Exception:
        pass
    try:
        du = shutil.disk_usage("/app/app/data")
        info["disk"] = {
            "total_gb": round(du.total / (1024**3), 1),
            "used_gb": round(du.used / (1024**3), 1),
            "free_gb": round(du.free / (1024**3), 1),
            "used_percent": round((du.used / du.total) * 100) if du.total else 0,
        }
    except Exception:
        pass
    try:
        with open("/proc/uptime", "r") as f:
            seconds = int(float(f.read().split()[0]))
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            minutes = (seconds % 3600) // 60
            info["uptime"] = f"{days}日 {hours}時間 {minutes}分"
    except Exception:
        pass
    return info

@router.get("/homelab/summary")
def homelab_summary():
    try:
        containers = list_docker_containers()
        total = len(containers)
        running = len([c for c in containers if c.get("state") == "running"])
        stopped = total - running

        enriched = []
        for c in containers:
            cat = classify_container(c.get("name",""), c.get("image","")) if "classify_container" in globals() else "other"
            url = service_url_from_container(c)
            enriched.append({
                **c,
                "category": cat,
                "url": url,
                "priority": service_score(c.get("name",""), c.get("image","")),
                "healthy": c.get("state") == "running",
            })
        enriched.sort(key=lambda x: (x.get("priority",99), x.get("name","")))

        launchers = [c for c in enriched if c.get("url")]
        important = [c for c in enriched if c.get("priority",99) < 99][:18]
        alerts = [c for c in enriched if c.get("state") != "running"]

        return {
            "host": host_info(),
            "docker": {
                "total": total,
                "running": running,
                "stopped": stopped,
                "health_rate": round((running / total) * 100) if total else 0,
            },
            "alerts": alerts,
            "important_services": important,
            "launchers": launchers,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _hm_kind(name: str, image: str):
    text = f"{name} {image}".lower()
    rules = [
        ("Jellyfin","media",["jellyfin"]),
        ("Immich","photo",["immich_server","immich-app/immich-server"]),
        ("Nextcloud","cloud",["nextcloud"]),
        ("Kavita","media",["kavita"]),
        ("Homepage","dashboard",["homepage"]),
        ("Portainer","dashboard",["portainer"]),
        ("Uptime Kuma","dashboard",["uptime-kuma"]),
        ("WUD","dashboard",["wud"]),
        ("Glances","dashboard",["glances"]),
        ("Stirling PDF","document",["stirling"]),
        ("Paperless-ngx","document",["paperless"]),
        ("n8n","automation",["n8n"]),
        ("PostgreSQL","database",["postgres"]),
        ("MariaDB","database",["mariadb"]),
        ("Redis","database",["redis","valkey"]),
        ("Cloudflare Tunnel","proxy",["cloudflared"]),
        ("Nginx","proxy",["nginx"]),
    ]
    for label, category, words in rules:
        if any(w in text for w in words):
            return label, category
    try:
        return name, classify_container(name, image)
    except Exception:
        return name, "other"

def _hm_ports(ports):
    pairs = []
    if isinstance(ports, dict):
        for cport, mappings in ports.items():
            if isinstance(mappings, list):
                for m in mappings:
                    hp = m.get("HostPort")
                    if hp:
                        pairs.append({"host_port": hp, "container_port": cport})
    return pairs

def _hm_url(name: str, image: str, ports):
    pairs = _hm_ports(ports)
    if not pairs:
        return ""
    text = f"{name} {image}".lower()
    prefs = []
    if "jellyfin" in text: prefs = ["8096"]
    elif "immich" in text: prefs = ["2283"]
    elif "nextcloud" in text: prefs = ["8800","80"]
    elif "homepage" in text: prefs = ["3030","3031","3000"]
    elif "portainer" in text: prefs = ["9443","9000"]
    elif "kavita" in text: prefs = ["5000"]
    elif "uptime-kuma" in text: prefs = ["3002","3001"]
    elif "stirling" in text: prefs = ["8085","8080"]
    elif "paperless" in text: prefs = ["8010","8000"]
    elif "n8n" in text: prefs = ["5678"]
    elif "glances" in text: prefs = ["61208"]
    for pref in prefs:
        for p in pairs:
            if p.get("host_port") == pref:
                scheme = "https" if pref in {"443","9443","8006"} else "http"
                return f"{scheme}://192.168.0.88:{pref}"
    hp = pairs[0].get("host_port")
    scheme = "https" if str(hp) in {"443","9443","8006"} else "http"
    return f"{scheme}://192.168.0.88:{hp}"

def _hm_score(name: str, image: str):
    text = f"{name} {image}".lower()
    order = ["homepage","jellyfin","immich","nextcloud","portainer","kavita","paperless","stirling","uptime-kuma","glances","n8n","wud","searxng","wallos","roundcube"]
    for i, key in enumerate(order):
        if key in text:
            return i
    return 99

@router.get("/homelab/discovery")
def homelab_discovery():
    try:
        containers = list_docker_containers()
        services = []
        children = []
        alerts = []
        for c in containers:
            name = c.get("name","")
            image = c.get("image","")
            label, category = _hm_kind(name, image)
            score = _hm_score(name, image)
            item = {
                **c,
                "label": label,
                "category": category,
                "url": _hm_url(name, image, c.get("ports")),
                "healthy": c.get("state") == "running",
                "score": score,
                "monitor_target": name,
                "recommended": score < 99,
            }
            services.append(item)
            if item["recommended"]:
                children.append({"parent":"Ubuntu Docker Host","child":label,"name":name,"category":category,"url":item["url"]})
            if not item["healthy"]:
                alerts.append(item)
        services.sort(key=lambda x:(x["score"], x["name"]))
        return {
            "host":{"name":"Ubuntu Docker Host","ip":"192.168.0.88","type":"docker-host"},
            "services":services,
            "recommended_services":[s for s in services if s["recommended"]],
            "alerts":alerts,
            "topology":{"root":"Ubuntu Docker Host","children":children},
            "external_candidates":[
                {"name":"TrueNAS","ip":"192.168.0.205","checks":["WebUI","SMB 445","Ping"]},
                {"name":"Proxmox","ip":"192.168.0.151","checks":["WebUI 8006","Ping"]},
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



def _tcp_check(host: str, port: int, timeout: float = 1.5):
    import socket
    start = time.time()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return normalize_datetime_fields({"status": "online", "response_ms": int((time.time() - start) * 1000), "error": ""})
    except Exception as e:
        return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": str(e)})

def _ping_check(host: str):
    status, ms, err = run_ping(host)
    return normalize_datetime_fields({"status": status, "response_ms": ms, "error": err})

def _disk_info():
    import shutil
    import os
    targets = ["/", "/app/app/data"]
    result = []
    for t in targets:
        try:
            du = shutil.disk_usage(t)
            result.append({
                "path": t,
                "total_gb": round(du.total / (1024**3), 1),
                "used_gb": round(du.used / (1024**3), 1),
                "free_gb": round(du.free / (1024**3), 1),
                "used_percent": round((du.used / du.total) * 100) if du.total else 0,
                "status": "warning" if du.total and (du.used / du.total) >= 0.85 else "ok"
            })
        except Exception as e:
            result.append({"path": t, "status": "error", "error": str(e)})
    return result

def _tailscale_info():
    import subprocess, json
    try:
        r = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True, timeout=3)
        if r.returncode != 0:
            return normalize_datetime_fields({"available": False, "status": "unknown", "error": r.stderr.strip() or "tailscale command failed"})
        data = json.loads(r.stdout)
        self_node = data.get("Self", {})
        return {
            "available": True,
            "status": "online" if self_node.get("Online") else "offline",
            "hostname": self_node.get("HostName", ""),
            "tailscale_ips": self_node.get("TailscaleIPs", []),
            "exit_node": bool(self_node.get("ExitNode", False)),
            "subnet_routes": self_node.get("AllowedIPs", []),
        }
    except FileNotFoundError:
        return normalize_datetime_fields({"available": False, "status": "not_installed", "error": "tailscale command not found in container"})
    except Exception as e:
        return normalize_datetime_fields({"available": False, "status": "error", "error": str(e)})

@router.get("/homelab/stable-summary")
def homelab_stable_summary():
    try:
        containers = list_docker_containers()
        running = len([c for c in containers if c.get("state") == "running"])
        total = len(containers)
        stopped = total - running
        stopped_items = [c for c in containers if c.get("state") != "running"]

        truenas_ip = "192.168.0.205"
        proxmox_ip = "192.168.0.151"
        ubuntu_ip = "192.168.0.88"

        checks = {
            "ubuntu": {
                "name": "Ubuntu Docker Host",
                "ip": ubuntu_ip,
                "ping": _ping_check(ubuntu_ip),
                "ssh": _tcp_check(ubuntu_ip, 22),
            },
            "truenas": {
                "name": "TrueNAS",
                "ip": truenas_ip,
                "ping": _ping_check(truenas_ip),
                "smb": _tcp_check(truenas_ip, 445),
                "webui_http": _tcp_check(truenas_ip, 80),
                "webui_https": _tcp_check(truenas_ip, 443),
            },
            "proxmox": {
                "name": "Proxmox",
                "ip": proxmox_ip,
                "ping": _ping_check(proxmox_ip),
                "webui": _tcp_check(proxmox_ip, 8006),
            }
        }

        service_keywords = ["jellyfin", "immich", "nextcloud", "homepage", "portainer", "kavita", "paperless", "stirling", "uptime-kuma", "glances", "n8n", "wud"]
        services = []
        for c in containers:
            text = f"{c.get('name','')} {c.get('image','')}".lower()
            if any(k in text for k in service_keywords):
                try:
                    label, category = _hm_kind(c.get("name",""), c.get("image",""))
                    url = _hm_url(c.get("name",""), c.get("image",""), c.get("ports"))
                except Exception:
                    label, category, url = c.get("name",""), "other", ""
                services.append({
                    **c,
                    "label": label,
                    "category": category,
                    "url": url,
                    "healthy": c.get("state") == "running"
                })

        warnings = []
        if stopped:
            warnings.append({"level": "warning", "message": f"停止中コンテナ {stopped} 件"})
        for d in _disk_info():
            if d.get("status") == "warning":
                warnings.append({"level": "warning", "message": f"ディスク使用率 {d.get('path')}: {d.get('used_percent')}%"})
        if checks["truenas"]["smb"]["status"] != "online":
            warnings.append({"level": "warning", "message": "TrueNAS SMB(445)に接続できません"})
        if checks["proxmox"]["webui"]["status"] != "online":
            warnings.append({"level": "warning", "message": "Proxmox WebUI(8006)に接続できません"})

        overall = "ok" if not warnings else "warning"
        if running == 0 and total > 0:
            overall = "critical"

        return {
            "overall": overall,
            "warnings": warnings,
            "docker": {
                "total": total,
                "running": running,
                "stopped": stopped,
                "health_rate": round((running / total) * 100) if total else 0,
                "stopped_items": stopped_items,
            },
            "checks": checks,
            "disks": _disk_info(),
            "tailscale": _tailscale_info(),
            "services": services,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v110_tcp(host: str, port: int, timeout: float = 1.5):
    start = time.time()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return normalize_datetime_fields({"status": "online", "response_ms": int((time.time() - start) * 1000), "error": ""})
    except Exception as e:
        return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": str(e)})

def _v110_ping(host: str):
    status, ms, err = run_ping(host)
    return normalize_datetime_fields({"status": status, "response_ms": ms, "error": err})

def _v110_host():
    import os, shutil, platform
    info = {"hostname": platform.node(), "platform": platform.platform(), "cpu_count": os.cpu_count(), "loadavg": None, "memory": {}, "disk": [], "uptime": ""}
    try:
        info["loadavg"] = list(os.getloadavg())
    except Exception:
        pass
    try:
        with open("/proc/meminfo", "r") as f:
            mem = {}
            for line in f:
                k, v = line.split(":", 1)
                mem[k] = int(v.strip().split()[0])
            total = mem.get("MemTotal", 0)
            available = mem.get("MemAvailable", 0)
            used = total - available
            info["memory"] = {"total_mb": round(total/1024), "used_mb": round(used/1024), "available_mb": round(available/1024), "used_percent": round((used/total)*100) if total else 0}
    except Exception as e:
        info["memory"] = {"error": str(e)}
    for path in ["/", "/app/app/data"]:
        try:
            du = shutil.disk_usage(path)
            pct = round((du.used / du.total) * 100) if du.total else 0
            info["disk"].append({"path": path, "total_gb": round(du.total/(1024**3),1), "used_gb": round(du.used/(1024**3),1), "free_gb": round(du.free/(1024**3),1), "used_percent": pct, "status": "warning" if pct >= 85 else "ok"})
        except Exception as e:
            info["disk"].append({"path": path, "status": "error", "error": str(e)})
    try:
        with open("/proc/uptime","r") as f:
            sec = int(float(f.read().split()[0]))
            info["uptime"] = f"{sec//86400}日 {(sec%86400)//3600}時間 {(sec%3600)//60}分"
    except Exception:
        pass
    return info

def _v110_tailscale():
    import subprocess, json
    try:
        r = subprocess.run(["tailscale", "status", "--json"], capture_output=True, text=True, timeout=3)
        if r.returncode != 0:
            return normalize_datetime_fields({"available": False, "status": "unavailable", "error": r.stderr.strip() or "tailscale command failed"})
        data = json.loads(r.stdout)
        self_node = data.get("Self", {})
        return normalize_datetime_fields({"available": True, "status": "online" if self_node.get("Online") else "offline", "backend_state": data.get("BackendState",""), "hostname": self_node.get("HostName",""), "dns_name": self_node.get("DNSName",""), "tailscale_ips": self_node.get("TailscaleIPs", []), "os": self_node.get("OS","")})
    except FileNotFoundError:
        return normalize_datetime_fields({"available": False, "status": "not_installed_in_container", "error": "tailscale command not found in backend container"})
    except Exception as e:
        return normalize_datetime_fields({"available": False, "status": "error", "error": str(e)})

def _v110_category(name: str, image: str):
    try:
        return classify_container(name, image)
    except Exception:
        return "other"

@router.get("/homelab/infra-summary")
def homelab_infra_summary():
    try:
        containers = list_docker_containers()
        running = len([c for c in containers if c.get("state") == "running"])
        total = len(containers)
        categories = {}
        unhealthy = []
        for c in containers:
            cat = _v110_category(c.get("name",""), c.get("image",""))
            categories[cat] = categories.get(cat, 0) + 1
            state = c.get("state", "")
            status = str(c.get("status", "")).lower()
            if state != "running" or "unhealthy" in status or "restarting" in status or "dead" in status:
                unhealthy.append({**c, "category": cat})
        ips = {"ubuntu": "192.168.0.88", "truenas": "192.168.0.205", "proxmox": "192.168.0.151"}
        infra = [
            {"name": "Ubuntu Docker Host", "ip": ips["ubuntu"], "type": "ubuntu", "checks": {"Ping": _v110_ping(ips["ubuntu"]), "SSH 22": _v110_tcp(ips["ubuntu"], 22), "Frontend 3880": _v110_tcp(ips["ubuntu"], 3880), "Backend 3881": _v110_tcp(ips["ubuntu"], 3881)}},
            {"name": "TrueNAS", "ip": ips["truenas"], "type": "truenas", "checks": {"Ping": _v110_ping(ips["truenas"]), "SMB 445": _v110_tcp(ips["truenas"], 445), "WebUI 80": _v110_tcp(ips["truenas"], 80), "WebUI 443": _v110_tcp(ips["truenas"], 443)}},
            {"name": "Proxmox", "ip": ips["proxmox"], "type": "proxmox", "checks": {"Ping": _v110_ping(ips["proxmox"]), "WebUI 8006": _v110_tcp(ips["proxmox"], 8006)}},
        ]
        host = _v110_host()
        warnings = []
        for c in unhealthy:
            warnings.append({"level":"warning", "message": f"Docker要確認: {c.get('name')} ({c.get('state')})"})
        if host.get("memory", {}).get("used_percent", 0) >= 85:
            warnings.append({"level":"warning", "message": f"メモリ使用率 {host['memory'].get('used_percent')}%"})
        for d in host.get("disk", []):
            if d.get("status") == "warning":
                warnings.append({"level":"warning", "message": f"ディスク使用率 {d.get('path')}: {d.get('used_percent')}%"})
        for node in infra:
            for cname, chk in node["checks"].items():
                if chk.get("status") not in {"online", "ok"}:
                    warnings.append({"level":"warning", "message": f"{node['name']} {cname} 未疎通"})
        return normalize_datetime_fields({"overall": "ok" if not warnings else "warning", "host": host, "tailscale": _v110_tailscale(), "docker": {"total": total, "running": running, "stopped": total-running, "health_rate": round((running/total)*100) if total else 0, "categories": categories, "unhealthy": unhealthy}), "infra": infra, "warnings": warnings[:30], "fixed_ips": ips}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v120_local_service_check(service_name: str, host_port: int, container_name: str = ""):
    # HomeNet自身はDockerコンテナ状態を最優先で判定する
    try:
        containers = list_docker_containers()
        for c in containers:
            if container_name and c.get("name") == container_name:
                if c.get("state") == "running":
                    return normalize_datetime_fields({"status": "online", "response_ms": 0, "error": "", "method": "docker-container-running"})
                return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": c.get("status", ""), "method": "docker-container-state"})
    except Exception:
        pass

    # Docker Composeのサービス名で確認
    service_targets = []
    if service_name == "frontend":
        service_targets = [("frontend", 80)]
    elif service_name == "backend":
        service_targets = [("backend", 8000)]

    for host, port in service_targets:
        r = _v110_tcp(host, port) if "_v110_tcp" in globals() else {"status": run_tcp(f"{host}:{port}")[0], "response_ms": 0, "error": ""}
        if r.get("status") == "online":
            r["method"] = f"docker-dns:{host}:{port}"
            return r

    # 最後にホスト側公開ポートへフォールバック
    for host in ["127.0.0.1", "host.docker.internal", "192.168.0.88"]:
        r = _v110_tcp(host, host_port) if "_v110_tcp" in globals() else {"status": run_tcp(f"{host}:{host_port}")[0], "response_ms": 0, "error": ""}
        if r.get("status") == "online":
            r["method"] = f"tcp:{host}:{host_port}"
            return r

    return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": "all checks failed", "method": "fallback-all-failed"})

def _v120_tailscale_display():
    try:
        info = _v110_tailscale() if "_v110_tailscale" in globals() else {}
        if info.get("available"):
            return normalize_datetime_fields({**info, "display_status": "online", "display_label": "Tailscale Online"})
        return {
            **info,
            "available": False,
            "display_status": "assumed_online",
            "display_label": "Tailscale利用中",
            "hostname": "ubuntu-hyper-v",
            "tailscale_ips": ["100.119.72.7"],
            "hint": "ホスト側でTailscale稼働確認済み。コンテナ内にtailscaleコマンドが無いため既知IPを表示。",
        }
    except Exception as e:
        return {
            "available": False,
            "status": "assumed_online",
            "display_status": "assumed_online",
            "display_label": "Tailscale利用中",
            "hostname": "ubuntu-hyper-v",
            "tailscale_ips": ["100.119.72.7"],
            "error": str(e),
        }

@router.get("/homelab/infra-summary-v2")
def homelab_infra_summary_v2():
    try:
        base = homelab_infra_summary()

        ubuntu = None
        for node in base.get("infra", []):
            if node.get("type") == "ubuntu":
                ubuntu = node
                break

        if ubuntu:
            ubuntu["checks"]["Frontend 3880"] = _v120_local_service_check("frontend", 3880, "homenet-map-jp-frontend")
            ubuntu["checks"]["Backend 3881"] = _v120_local_service_check("backend", 3881, "homenet-map-jp-backend")

        base["tailscale"] = _v120_tailscale_display()

        warnings = []
        for c in base.get("docker", {}).get("unhealthy", []):
            warnings.append({"level": "warning", "message": f"Docker要確認: {c.get('name')} ({c.get('state')})"})

        host = base.get("host", {})
        if host.get("memory", {}).get("used_percent", 0) >= 85:
            warnings.append({"level": "warning", "message": f"メモリ使用率 {host['memory'].get('used_percent')}%"})

        for d in host.get("disk", []):
            if d.get("status") == "warning":
                warnings.append({"level": "warning", "message": f"ディスク使用率 {d.get('path')}: {d.get('used_percent')}%"})

        for node in base.get("infra", []):
            for cname, chk in node.get("checks", {}).items():
                if chk.get("status") not in {"online", "ok"}:
                    warnings.append({"level": "warning", "message": f"{node.get('name')} {cname} 未疎通"})

        base["warnings"] = warnings[:30]
        base["overall"] = "ok" if not warnings else "warning"
        base["dedicated"] = {
            "truenas": {
                "name": "TrueNAS",
                "ip": "192.168.0.205",
                "checks": next((n.get("checks") for n in base.get("infra", []) if n.get("type") == "truenas"), {}),
            },
            "proxmox": {
                "name": "Proxmox",
                "ip": "192.168.0.151",
                "checks": next((n.get("checks") for n in base.get("infra", []) if n.get("type") == "proxmox"), {}),
            },
            "ubuntu": {
                "name": "Ubuntu Docker Host",
                "ip": "192.168.0.88",
                "checks": ubuntu.get("checks", {}) if ubuntu else {},
            },
        }
        return base
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v121_fast_tcp(host: str, port: int, timeout: float = 0.45):
    start = time.time()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return normalize_datetime_fields({"status": "online", "response_ms": int((time.time() - start) * 1000), "error": "", "method": "fast-tcp"})
    except Exception as e:
        return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": str(e), "method": "fast-tcp"})

def _v121_container_state(container_name: str):
    try:
        for c in list_docker_containers():
            if c.get("name") == container_name:
                if c.get("state") == "running":
                    return normalize_datetime_fields({"status": "online", "response_ms": 0, "error": "", "method": "docker-container-running"})
                return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": c.get("status", ""), "method": "docker-container-state"})
    except Exception as e:
        return normalize_datetime_fields({"status": "unknown", "response_ms": 0, "error": str(e), "method": "docker-container-error"})
    return normalize_datetime_fields({"status": "offline", "response_ms": 0, "error": "container not found", "method": "docker-container-not-found"})

def _v121_host_minimal():
    try:
        return _v110_host()
    except Exception:
        try:
            return _host_metrics_v110()
        except Exception as e:
            return normalize_datetime_fields({"hostname": "unknown", "memory": {}), "disk": [], "error": str(e)}

def _v121_tailscale_safe():
    return {
        "available": False,
        "status": "assumed_online",
        "display_status": "assumed_online",
        "display_label": "Tailscale利用中",
        "hostname": "ubuntu-hyper-v",
        "tailscale_ips": ["100.119.72.7"],
        "hint": "ホスト側でTailscale稼働確認済み。コンテナ内コマンドは実行せず既知IPを表示。",
    }

@router.get("/homelab/infra-summary-fast")
def homelab_infra_summary_fast():
    try:
        containers = list_docker_containers()
        running = len([c for c in containers if c.get("state") == "running"])
        total = len(containers)
        categories = {}
        unhealthy = []
        for c in containers:
            try:
                cat = classify_container(c.get("name",""), c.get("image",""))
            except Exception:
                cat = "other"
            categories[cat] = categories.get(cat, 0) + 1
            state = c.get("state", "")
            status = str(c.get("status", "")).lower()
            if state != "running" or "unhealthy" in status or "restarting" in status or "dead" in status:
                unhealthy.append({**c, "category": cat})

        ips = {"ubuntu": "192.168.0.88", "truenas": "192.168.0.205", "proxmox": "192.168.0.151"}
        infra = [
            {"name": "Ubuntu Docker Host", "ip": ips["ubuntu"], "type": "ubuntu", "checks": {
                "Frontend 3880": _v121_container_state("homenet-map-jp-frontend"),
                "Backend 3881": _v121_container_state("homenet-map-jp-backend"),
                "SSH 22": _v121_fast_tcp(ips["ubuntu"], 22)
            }},
            {"name": "TrueNAS", "ip": ips["truenas"], "type": "truenas", "checks": {
                "SMB 445": _v121_fast_tcp(ips["truenas"], 445),
                "WebUI 80": _v121_fast_tcp(ips["truenas"], 80),
                "WebUI 443": _v121_fast_tcp(ips["truenas"], 443)
            }},
            {"name": "Proxmox", "ip": ips["proxmox"], "type": "proxmox", "checks": {
                "WebUI 8006": _v121_fast_tcp(ips["proxmox"], 8006)
            }}
        ]

        host = _v121_host_minimal()
        warnings = []
        for c in unhealthy:
            warnings.append({"level": "warning", "message": f"Docker要確認: {c.get('name')} ({c.get('state')})"})
        if host.get("memory", {}).get("used_percent", 0) >= 85:
            warnings.append({"level": "warning", "message": f"メモリ使用率 {host['memory'].get('used_percent')}%"})
        for d in host.get("disk", []):
            if d.get("status") == "warning":
                warnings.append({"level": "warning", "message": f"ディスク使用率 {d.get('path')}: {d.get('used_percent')}%"})
        for node in infra:
            statuses = [chk.get("status") for chk in node.get("checks", {}).values()]
            if statuses and all(s not in {"online", "ok"} for s in statuses):
                warnings.append({"level": "warning", "message": f"{node.get('name')} 全チェック未疎通"})

        return {
            "overall": "ok" if not warnings else "warning",
            "host": host,
            "tailscale": _v121_tailscale_safe(),
            "docker": {"total": total, "running": running, "stopped": total-running, "health_rate": round((running/total)*100) if total else 0, "categories": categories, "unhealthy": unhealthy},
            "infra": infra,
            "warnings": warnings[:30],
            "fixed_ips": ips
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v122_normalize_check(check):
    if not isinstance(check, dict):
        return check
    method = check.get("method", "")
    # frontend display側で重複しないように method_display を別で持つ
    method_display = method
    if method_display == "docker-container-running":
        method_display = "Docker稼働"
    elif method_display == "fast-tcp":
        method_display = "TCP疎通"
    elif method_display.startswith("tcp:"):
        method_display = "TCP疎通"
    elif method_display.startswith("docker-dns:"):
        method_display = "Docker内部疎通"
    return normalize_datetime_fields({**check, "method_display": method_display})

def _v122_is_ignored_container(name: str):
    # 手動で停止している管理用/旧コンテナは警告対象から外す
    ignore_names = {"manual-server"}
    return name in ignore_names

@router.get("/homelab/infra-summary-display")
def homelab_infra_summary_display():
    try:
        base = homelab_infra_summary_fast()

        # Docker要確認から除外対象を分離
        ignored = []
        active_unhealthy = []
        for c in base.get("docker", {}).get("unhealthy", []):
            if _v122_is_ignored_container(c.get("name", "")):
                ignored.append(c)
            else:
                active_unhealthy.append(c)

        base["docker"]["unhealthy"] = active_unhealthy
        base["docker"]["ignored"] = ignored

        # checksに表示用methodを追加
        for node in base.get("infra", []):
            for cname, chk in list(node.get("checks", {}).items()):
                node["checks"][cname] = _v122_normalize_check(chk)

        # tailscale表示を自然な日本語へ
        ts = base.get("tailscale", {})
        if ts.get("display_status") == "assumed_online" or ts.get("status") == "assumed_online":
            base["tailscale"] = {
                **ts,
                "status_label": "利用中",
                "status": "online",
                "method_display": "既知IP表示",
            }
        else:
            base["tailscale"] = {
                **ts,
                "status_label": "Online" if ts.get("status") == "online" else ts.get("status", "unknown"),
                "method_display": "tailscale status",
            }

        # warnings再計算：ignoredは警告に入れない
        warnings = []
        for c in active_unhealthy:
            warnings.append({"level": "warning", "message": f"Docker要確認: {c.get('name')} ({c.get('state')})"})

        host = base.get("host", {})
        if host.get("memory", {}).get("used_percent", 0) >= 85:
            warnings.append({"level": "warning", "message": f"メモリ使用率 {host['memory'].get('used_percent')}%"})
        for d in host.get("disk", []):
            if d.get("status") == "warning":
                warnings.append({"level": "warning", "message": f"ディスク使用率 {d.get('path')}: {d.get('used_percent')}%"})

        for node in base.get("infra", []):
            statuses = [chk.get("status") for chk in node.get("checks", {}).values()]
            if statuses and all(s not in {"online", "ok"} for s in statuses):
                warnings.append({"level": "warning", "message": f"{node.get('name')} 全チェック未疎通"})

        base["warnings"] = warnings[:30]
        base["overall"] = "ok" if not warnings else "warning"
        base["ignored_count"] = len(ignored)
        return base
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v130_clean_check(chk):
    if not isinstance(chk, dict):
        return chk
    status = chk.get("status", "unknown")
    method = chk.get("method_display") or chk.get("method") or ""
    if method == "docker-container-running":
        method = "Docker稼働"
    elif method == "fast-tcp":
        method = "TCP疎通"
    elif method.startswith("tcp:"):
        method = "TCP疎通"
    elif method.startswith("docker-dns:"):
        method = "Docker内部疎通"
    elif method == "":
        method = "-"
    return {
        **chk,
        "method": chk.get("method", ""),
        "method_display": method,
        "display": f"{status} / {method}" if method != "-" else status,
    }

def _v130_service_importance(name: str, image: str):
    text = f"{name} {image}".lower()
    order = [
        "homepage", "jellyfin", "immich", "nextcloud", "portainer", "kavita",
        "paperless", "stirling", "uptime-kuma", "glances", "n8n", "wud"
    ]
    for i, key in enumerate(order):
        if key in text:
            return i
    return 99

@router.get("/homelab/monitoring-center")
def homelab_monitoring_center():
    try:
        try:
            base = homelab_infra_summary_display()
        except Exception:
            try:
                base = homelab_infra_summary_fast()
            except Exception:
                base = homelab_infra_summary()

        for node in base.get("infra", []):
            for key, chk in list(node.get("checks", {}).items()):
                node["checks"][key] = _v130_clean_check(chk)

        containers = list_docker_containers()
        services = []
        for c in containers:
            name = c.get("name", "")
            image = c.get("image", "")
            try:
                label, category = _hm_kind(name, image)
                url = _hm_url(name, image, c.get("ports"))
            except Exception:
                try:
                    category = classify_container(name, image)
                except Exception:
                    category = "other"
                label = name
                url = ""
            score = _v130_service_importance(name, image)
            if score < 99 or url:
                services.append({
                    **c,
                    "label": label,
                    "category": category,
                    "url": url,
                    "score": score,
                    "healthy": c.get("state") == "running",
                })
        services.sort(key=lambda x: (x.get("score", 99), x.get("name", "")))

        truenas = next((n for n in base.get("infra", []) if n.get("type") == "truenas"), None)
        proxmox = next((n for n in base.get("infra", []) if n.get("type") == "proxmox"), None)
        ubuntu = next((n for n in base.get("infra", []) if n.get("type") == "ubuntu"), None)

        top_alerts = []
        for w in base.get("warnings", []):
            top_alerts.append({**w, "source": "infra"})
        if base.get("docker", {}).get("stopped", 0) > 0 and base.get("ignored_count", 0) == 0:
            top_alerts.append({"level": "warning", "message": f"Docker停止 {base['docker']['stopped']} 件", "source": "docker"})

        return {
            "overall": base.get("overall", "unknown"),
            "top_alerts": top_alerts[:10],
            "summary": {
                "docker_health_rate": base.get("docker", {}).get("health_rate", 0),
                "docker_running": base.get("docker", {}).get("running", 0),
                "docker_total": base.get("docker", {}).get("total", 0),
                "docker_stopped": base.get("docker", {}).get("stopped", 0),
                "ignored_count": base.get("ignored_count", len(base.get("docker", {}).get("ignored", []))),
                "warning_count": len(base.get("warnings", [])),
                "ram_percent": base.get("host", {}).get("memory", {}).get("used_percent", 0),
            },
            "nodes": {
                "ubuntu": ubuntu,
                "truenas": truenas,
                "proxmox": proxmox,
            },
            "host": base.get("host", {}),
            "tailscale": base.get("tailscale", {}),
            "docker": base.get("docker", {}),
            "services": services,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _v131_clean_method(method: str):
    if not method:
        return ""
    if method == "docker-container-running":
        return "Docker稼働"
    if method == "fast-tcp":
        return "TCP疎通"
    if method.startswith("tcp:"):
        return "TCP疎通"
    if method.startswith("docker-dns:"):
        return "Docker内部疎通"
    return method

def _v131_clean_summary(base):
    for node in base.get("infra", []):
        for key, chk in list(node.get("checks", {}).items()):
            if not isinstance(chk, dict):
                continue
            method = _v131_clean_method(chk.get("method_display") or chk.get("method") or "")
            status = chk.get("status", "unknown")
            node["checks"][key] = {
                **chk,
                "method_display": method,
                "display": f"{status} / {method}" if method else status,
            }
    ts = base.get("tailscale", {})
    if ts.get("display_status") == "assumed_online" or ts.get("status") in {"assumed_online", "online"}:
        base["tailscale"] = {
            **ts,
            "status": "online",
            "status_label": "利用中",
            "display_label": "Tailscale利用中",
            "method_display": "既知IP表示",
        }
    return base

@router.get("/homelab/infra-summary-clean")
def homelab_infra_summary_clean():
    try:
        try:
            base = homelab_infra_summary_display()
        except Exception:
            try:
                base = homelab_infra_summary_fast()
            except Exception:
                base = homelab_infra_summary()
        return _v131_clean_summary(base)
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
    return normalize_datetime_fields({"success": True})

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
    return normalize_datetime_fields({"checked": len(results), "results": results})
