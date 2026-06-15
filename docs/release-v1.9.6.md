# Ver1.9.6 Host Network Scanner

- Docker内スキャンからUbuntuホスト側スクリプト方式へ変更
- scripts/host_network_scan.py を追加
- 結果を backend/app/data/network_scan_result.json に保存
- Backend APIは結果JSONを読み込み、登録済みIP/MAC判定を付与
- ./scripts:/app/scripts:ro をbackendへマウント
- HTMLマニュアル更新
