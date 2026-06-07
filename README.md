# HomeNet Map JP

MVP Ver0.6.3 Monitor Hotfix

## Ver0.6.3 修正内容

- backend Dockerイメージに `iputils-ping` を追加
- Ping監視の `[Errno 2] No such file or directory: 'ping'` を修正
- TCPポート監視を追加
- Pingコマンドが無い場合のフォールバック処理を追加
- 監視画面で TCP Port を選択可能に変更

## TCP監視例

- SSH: `192.168.0.88:22`
- SMB: `192.168.0.205:445`
- Homepage: `192.168.0.88:3030`
- Proxmox: `192.168.0.151:8006`
