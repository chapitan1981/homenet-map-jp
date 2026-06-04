# HomeNet Map JP MVP Ver0.4.1

## 追加機能

構成図の接続線をDB保存に変更。

### 追加内容

- `device_connections` テーブル
- `/api/connections`
- 接続線追加
- 接続線削除
- 接続線メモ
- バックアップJSON対応

### 改善点

Ver0.3.9ではブラウザ localStorage 保存だったため、端末ごとに接続情報が分かれていた。
Ver0.4.1ではDB保存になり、別端末・別ブラウザでも共有できる。
