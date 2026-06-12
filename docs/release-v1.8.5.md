# Ver1.8.5 Monitoring Display Direct Hotfix

- Ver1.8.4のBackend起動エラーを回避するため、Ver1.8.3ベースへ復帰
- 監視一覧の実際の表示行を直接修正
- `new Date(m.last_checked_at).toLocaleString('ja-JP')` を `formatJst(m.last_checked_at)` に変更
- SQLite/SQLAlchemy由来のタイムゾーンなしUTC値をUTCとして扱い、JST表示
- /api/time-debug を軽量追加
- HTMLマニュアル更新
