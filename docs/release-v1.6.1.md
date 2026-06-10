# Ver1.6.1 Device Room Save Hotfix

- 機器管理の保管部屋/設置部屋保存を修正
- room_id / location_id の両方を保存 payload に含める
- SQLiteにroom_id/location_id列がない場合の軽量マイグレーションを追加
- 保存失敗時のエラー表示を詳細化
- 既存データを保持したまま更新可能
