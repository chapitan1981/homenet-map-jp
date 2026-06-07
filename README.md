# HomeNet Map JP

MVP Ver0.6.5 Docker Monitor

## Ver0.6.5 追加内容

- Dockerコンテナ一覧取得
- Dockerコンテナ監視を追加
- 監視方式に `Docker Container` を追加
- Dockerコンテナカードをクリックして監視設定へ反映
- Dockerソケットをbackendへ読み取り専用マウント

## 注意

docker-compose.yml の backend に以下を追加しています。

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```
