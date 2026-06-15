#!/usr/bin/env python3
import argparse, concurrent.futures, ipaddress, json, re, socket, subprocess, time
from pathlib import Path

MAC_RE = re.compile(r"([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}")
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
OUI = {"b8:27:eb":"Raspberry Pi","dc:a6:32":"Raspberry Pi","52:54:00":"QEMU/KVM","bc:24:11":"Proxmox/QEMU","02:42":"Docker","00:15:5d":"Hyper-V","00:50:56":"VMware","00:0c:29":"VMware","00:11:32":"Synology","00:1d:0f":"QNAP","24:5e:be":"QNAP","00:25:90":"Supermicro","f8:b1:56":"Intel","00:e0:4c":"Realtek","ec:fa:bc":"TP-Link","50:c7:bf":"TP-Link","cc:2d:e0":"Xiaomi","3c:7c:3f":"Apple","f0:18:98":"Apple"}
PORTS = {22:"SSH",53:"DNS",80:"HTTP",139:"NetBIOS",443:"HTTPS",445:"SMB",5000:"NAS/Web候補",5001:"NAS HTTPS候補",8006:"Proxmox",8080:"HTTP-alt",8081:"HTTP-alt",8123:"Home Assistant",32400:"Plex",3880:"HomeNet Map UI",3881:"HomeNet Map API"}

def norm_mac(m): return (m or "").lower().replace("-", ":")
def vendor(mac):
    m = norm_mac(mac)
    for p, v in OUI.items():
        if m.startswith(p): return v
    return ""
def run(cmd, timeout=2):
    try: return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout
    except Exception: return ""
def ping(ip, timeout_ms):
    try:
        return subprocess.run(["ping","-c","1","-W","1",ip], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=max(0.5, timeout_ms/1000+0.5)).returncode == 0
    except Exception: return False
def tcp(ip, port, timeout_ms):
    try:
        with socket.create_connection((ip, port), timeout=max(0.1, timeout_ms/1000)): return True
    except Exception: return False
def hostname(ip):
    try: return socket.gethostbyaddr(ip)[0]
    except Exception: return ""
def read_arp():
    arp = {}
    try:
        with open("/proc/net/arp", "r", encoding="utf-8", errors="ignore") as f:
            for line in f.readlines()[1:]:
                parts = line.split()
                if len(parts) >= 4 and MAC_RE.fullmatch(parts[3]):
                    mac = norm_mac(parts[3])
                    if mac != "00:00:00:00:00:00": arp[parts[0]] = mac
    except Exception: pass
    for cmd in (["ip","neigh"], ["arp","-an"]):
        for line in run(cmd).splitlines():
            im = IP_RE.search(line); mm = MAC_RE.search(line)
            if im and mm:
                mac = norm_mac(mm.group(0))
                if mac != "00:00:00:00:00:00": arp[im.group(0)] = mac
    return arp
def scan_one(ip, ports, timeout_ms, do_ping):
    open_ports = [p for p in ports if tcp(ip, p, timeout_ms)]
    ping_ok = ping(ip, timeout_ms) if do_ping else False
    online = ping_ok or bool(open_ports)
    return {"ip":ip,"online":online,"ping":ping_ok,"open_ports":open_ports,"services":[PORTS.get(p, str(p)) for p in open_ports],"hostname":hostname(ip) if online else ""}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cidr", default="192.168.0.0/24")
    ap.add_argument("--ports", default="22,80,443,445,8006,8123,3880,3881")
    ap.add_argument("--timeout-ms", type=int, default=300)
    ap.add_argument("--max-hosts", type=int, default=256)
    ap.add_argument("--ping", action="store_true", default=True)
    ap.add_argument("--no-ping", action="store_false", dest="ping")
    ap.add_argument("--out", default="backend/app/data/network_scan_result.json")
    args = ap.parse_args()
    net = ipaddress.ip_network(args.cidr, strict=False)
    hosts = list(net.hosts())
    if len(hosts) > args.max_hosts: raise SystemExit(f"too many hosts: {len(hosts)}")
    ports = []
    for x in args.ports.split(","):
        try:
            p = int(x.strip())
            if 1 <= p <= 65535: ports.append(p)
        except Exception: pass
    started = time.time()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(128, max(16, len(hosts)))) as ex:
        for fut in concurrent.futures.as_completed([ex.submit(scan_one, str(ip), ports, args.timeout_ms, args.ping) for ip in hosts]):
            r = fut.result()
            if r["online"]: results.append(r)
    arp = read_arp()
    for r in results:
        mac = arp.get(r["ip"], "")
        r["mac_address"] = mac
        r["vendor_hint"] = vendor(mac)
        r["service_hint"] = ", ".join(r["services"]) if r["services"] else ""
        r["suggested_name"] = r["hostname"] or r["vendor_hint"] or f"device-{r['ip'].replace('.', '-')}"
    results.sort(key=lambda x: tuple(int(n) for n in x["ip"].split(".")))
    out = {"source":"host-script","cidr":str(net),"created_at":time.strftime("%Y-%m-%dT%H:%M:%S%z"),"elapsed_sec":round(time.time()-started,2),"count":len(results),"mac_count":len([r for r in results if r.get("mac_address")]),"arp_count":len(arp),"ports":ports,"results":results}
    out_path = Path(args.out); out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"out":str(out_path),"count":out["count"],"mac_count":out["mac_count"],"arp_count":out["arp_count"]}, ensure_ascii=False))
if __name__ == "__main__": main()
