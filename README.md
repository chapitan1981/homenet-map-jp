# HomeNet Map JP

MVP Ver1.4.0 Home Lab Health

## Ver0.7.0 追加内容

- ホームラボ健康状態ページを追加
- Dockerコンテナ稼働率表示
- 停止中コンテナ警告表示
- 主要サービス自動分類
- カテゴリ別コンテナ集計
- 全Dockerコンテナ一覧
- Docker監視の一括登録
- ダッシュボードから健康状態ページへリンク追加

## 主要サービス自動分類例

- Jellyfin / Kavita: メディア
- Nextcloud: クラウド
- Immich: 写真
- Homepage / Portainer / Uptime Kuma / WUD / Glances: 管理
- Paperless / Stirling PDF: 文書
- n8n: 自動化
- PostgreSQL / MariaDB / Redis: DB/キャッシュ


## Ver0.7.1

- 健康状態ダッシュボードUI改善
- Docker正常率の大型表示
- カテゴリ別カードとフィルタ
- 停止中コンテナ警告強化


## Ver0.8.0

- ホームラボ統合ダッシュボード追加
- サービスURLランチャー追加
- ホスト情報表示
- Docker異常アラート表示


## Ver0.9.0

- 自動ホームラボ検出ページ追加
- Dockerサービス自動分類
- URL自動生成
- 構成図候補表示


## Ver1.0.0 Stable

- ホームラボ Stable ダッシュボード追加
- TrueNAS / Proxmox / Ubuntu 監視基礎表示
- Docker / ストレージ / Tailscale 状態表示


## Ver1.1.0

- インフラ監視ページ追加
- Ubuntu / Docker / Tailscale / TrueNAS / Proxmox の監視基礎強化


## Ver1.2.0

- Frontend/Backend監視の誤判定修正
- Tailscale表示改善
- インフラ監視の警告再計算改善


## Ver1.2.1

- インフラ監視タイムアウト修正
- 高速インフラ監視API追加
- HomeNet自身の監視はDocker状態で即判定


## Ver1.2.2

- インフラ監視表示改善
- Tailscale表示改善
- manual-serverを警告除外


## Ver1.3.0

- ホームラボ統合監視センター追加
- 重要アラート上部表示
- Ubuntu / TrueNAS / Proxmox / Docker / Tailscale を1画面に統合


## Ver1.3.1

- インフラ監視画面の重複表示を完全修正
- 統合監視センターは維持


## Ver1.4.0

- HTMLマニュアルページ追加
- 左メニューにマニュアルを追加
- 更新手順・トラブル対応を掲載
