# HomeNet Map JP MVP Ver0.3.2

## 修正内容

- 写真表示を小さめサムネイルに変更
- `object-fit: cover` によるクロップ表示
- サムネイルクリックで原寸画像を別タブ表示
- `/uploads/` を frontend Nginx から backend StaticFiles へ転送

## 補足

現時点のクロップは「表示上のクロップ」です。
実画像を切り抜いて保存する本格クロップ機能は、将来の写真編集機能で実装予定。
