# HomeNet Map JP

MVP Ver0.6.8 Docker Timeout Hotfix

## Ver0.6.8 修正内容

- Docker API取得時の `timed out` を修正
- HTTP/1.0 + Content-Length優先読み取りに変更
- chunked response fallback を維持
- Dockerコンテナ一覧取得の安定性を改善

## 反映後の確認

```bash
curl -s http://127.0.0.1:3881/api/docker/containers | jq .
```
