# HomeNet Map JP

日本語対応ホームラボ・デジタルツイン管理システム MVP Ver0.3.2 です。

## Ver0.3.2 修正内容

- 写真表示を小さめサムネイル化
- サムネイルをクロップ表示に変更
- 写真クリックで原寸画像を別タブ表示
- 「開く」リンクを追加
- `/uploads/` のNginxリバースプロキシ修正を同梱

## Ver0.3.0 追加内容

- 機器写真登録
- 部屋背景画像登録
- アップロード画像の表示・削除
- ラックビュー
- ラック内機器配置
- アップロードファイル永続化

## 更新手順

```bash
cd ~/homenet-map-jp
git pull
docker compose down
docker compose up -d --build --force-recreate
```
