# Ver1.9.7 True Host Scanner Fix

- Backendコンテナ内からのスキャン実行を廃止
- Ubuntuホストで scripts/host_network_scan.py を手動またはcron実行
- アプリは backend/app/data/network_scan_result.json を読み込むだけ
- /api/network-scan/host-command を追加
- HTMLマニュアル更新
