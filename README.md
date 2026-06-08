# HomeNet Map JP

MVP Ver0.6.9 Docker SDK Hotfix

## Ver0.6.9 修正内容

- Docker API手製パーサーを廃止
- Python Docker SDK を使用する方式へ変更
- Dockerコンテナ一覧取得の `timed out` を修正
- Docker監視の安定性を改善

## 重要

backend/requirements.txt に以下を追加しています。

```txt
docker==7.1.0
```

反映時は backend の再ビルドが必要です。

```bash
docker compose down
docker compose build --no-cache backend
docker compose up -d --build --force-recreate
```

## 反映後の確認

```bash
curl -s http://127.0.0.1:3881/api/docker/containers | jq .
```
