# HomeNet Map JP

日本語対応ホームラボ・デジタルツイン管理システム MVP Ver0.1.2 です。

## Ver0.1.2 追加内容

- 機器一覧から機器詳細画面へ移動
- 機器詳細画面に基本情報を表示
- PCパーツ登録機能を追加
- CPU / メモリ / GPU / SSD / HDD / 電源などの登録に対応
- パーツ削除に対応
- ネットワーク情報登録機能を追加
- LAN / Wi-Fi / Tailscale / VPN のIP情報登録に対応

## 起動方法

```bash
cd homenet-map-jp
docker compose up -d --build
```

## アクセス

```text
http://サーバーIP:3880
```

例：

```text
http://100.119.72.7:3880
```

## API確認

```text
http://サーバーIP:3880/api/health
```

## 停止

```bash
docker compose down
```
