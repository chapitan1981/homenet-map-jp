# HomeNet Map JP

日本語対応ホームラボ・デジタルツイン管理システム MVP Ver0.4.1 です。

## Ver0.4.1 追加内容

- 構成図の接続線をDB保存化
- 接続線の追加・削除APIを追加
- 接続線が別端末・別ブラウザでも共有可能
- バックアップJSONに接続線情報を含める
- 接続線にメモ欄を追加
- Ver 0.4.1 表示へ更新

## 更新手順

```bash
cd ~/homenet-map-jp
git fetch origin
git reset --hard origin/main
docker compose down
docker compose up -d --build --force-recreate
```
