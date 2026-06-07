# HomeNet Map JP

MVP Ver0.5.0

## Ver0.5.0 追加内容

- ZIP Import / 復元機能
- 復元前のZIP内容確認
- 復元前の安全バックアップ作成
- DBコピー復元
- uploads写真復元
- バックアップ画面のUI整理
- Ver0.5.0としてホームラボ運用版に更新

## 注意

復元後は反映のため、Ubuntu側で以下を推奨します。

```bash
cd ~/homenet-map-jp
docker compose restart backend frontend
```
