# HomeNet Map JP

MVP Ver0.6.7 Docker API Hotfix

## Ver0.6.7 修正内容

- Docker Engine API の chunked response に対応
- Dockerソケット通信のHTTPレスポンス解析を改善
- `Extra data: line 1 column 5` エラーを修正
- Dockerコンテナ一覧取得のエラー表示を改善

## 反映後の確認

```bash
curl -s http://127.0.0.1:3881/api/docker/containers | jq .
```

Dockerコンテナ一覧がJSON配列で表示されればOKです。
