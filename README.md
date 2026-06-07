# HomeNet Map JP

MVP Ver0.6.2 Hotfix

## Ver0.6.2 修正内容

- Ver0.6.0 / 0.6.1 の backend 起動失敗を修正
- `schemas.py` の `datetime` import 不足を確実に修正
- `Optional` import を確実に追加
- `device_monitors` テーブルを起動時に自動作成
- 既存DBでも監視機能が起動できるように改善
- 監視機能のバックアップ対象化を確認

## 反映後の確認

```bash
cd ~/homenet-map-jp
docker compose down
docker compose up -d --build --force-recreate
docker compose ps
docker compose logs backend --tail=50
```

backend が healthy になればOKです。
