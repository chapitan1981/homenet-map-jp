#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
CIDR="${1:-192.168.0.0/24}"
PORTS="${2:-22,80,443,445,8006,8123,3880,3881}"
python3 scripts/host_network_scan.py --cidr "$CIDR" --ports "$PORTS" --out backend/app/data/network_scan_result.json
python3 - <<'PY'
import json
from pathlib import Path
d=json.loads(Path("backend/app/data/network_scan_result.json").read_text(encoding="utf-8"))
print("count:", d.get("count"))
print("mac_count:", d.get("mac_count"))
print("arp_count:", d.get("arp_count"))
print("source:", d.get("source"))
print("script_context:", d.get("script_context"))
PY
