# HomeNet Map JP

MVP Ver0.6.6 Compose Hotfix

## Ver0.6.6 修正内容

- Ver0.6.5 の docker-compose.yml で `volumes:` が重複する問題を修正
- backend の volumes を1つに統合
- Dockerソケット read-only mount を保持
- Docker監視機能はそのまま維持

## 修正後の backend volumes

```yaml
volumes:
  - ./backend/app/data:/app/app/data
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

## 反映後の確認

```bash
docker compose config
docker compose up -d --build --force-recreate
docker compose ps
```
