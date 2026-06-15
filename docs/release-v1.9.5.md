# Ver1.9.5 Network Scan Host ARP Fix

- MACアドレスが取得できない問題を修正
- ホスト側 /proc/net/arp をBackendコンテナへ読み取り専用マウント
- /host/proc/net/arp を優先してMACを取得
- スキャン完了メッセージにMAC取得件数とARP取得元を表示
- /api/network-scan/arp-debug を追加
- HTMLマニュアル更新
