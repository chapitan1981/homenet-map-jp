# HomeNet Map JP

日本語対応ホームラボ・デジタルツイン管理システム MVP Ver0.2.0 です。

## Ver0.2.0 追加内容

- 部屋編集機能
- 機器編集機能
- パーツ編集機能
- ネットワーク情報編集機能
- 機器検索機能
- 機器種別フィルタ
- アイコン選択機能
- タグ登録・削除機能

## 起動方法

```bash
cd homenet-map-jp
docker compose up -d --build
```

## 更新手順

Windows側で変更をpush後、Ubuntu側で以下を実行します。

```bash
cd ~/homenet-map-jp
git pull
docker compose up -d --build
```
