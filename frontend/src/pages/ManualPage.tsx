import { Link } from 'react-router-dom';

export default function ManualPage(){
  return <>
    <div className="page-title-row">
      <h2>HomeNet Map JP マニュアル</h2>
      <div className="page-actions">
        <Link className="small-button" to="/center">統合監視</Link>
        <Link className="small-button" to="/backup">バックアップ</Link>
      </div>
    </div>

    <div className="manual-hero">
      <div>
        <span>Ver1.4.0</span>
        <strong>ホームラボ運用マニュアル</strong>
        <p>機器管理・監視・自動検出・バックアップまでの基本操作をまとめています。</p>
      </div>
    </div>

    <div className="manual-layout">
      <aside className="manual-toc card">
        <h3>目次</h3>
        <a href="#overview">概要</a>
        <a href="#daily">日常運用</a>
        <a href="#devices">機器管理</a>
        <a href="#monitoring">監視</a>
        <a href="#center">統合監視</a>
        <a href="#discovery">自動検出</a>
        <a href="#layout">部屋・構成図</a>
        <a href="#backup">バックアップ</a>
        <a href="#protection">データ保護</a>
        <a href="#trouble">トラブル対応</a>
        <a href="#update">更新手順</a>
      </aside>

      <main className="manual-content">
        <section id="overview" className="card">
          <h3>1. 概要</h3>
          <p>HomeNet Map JP は、自宅ホームラボの機器・ネットワーク・Dockerサービス・監視状況をまとめて管理するアプリです。</p>
          <ul>
            <li>機器、部屋、ラック、写真、配置情報を登録できます。</li>
            <li>Dockerコンテナ、TrueNAS、Proxmox、Ubuntuホストの状態を確認できます。</li>
            <li>統合監視センターから主要サービスへ直接アクセスできます。</li>
          </ul>
        </section>

        <section id="daily" className="card">
          <h3>2. 日常運用</h3>
          <p>通常は左メニューの「統合監視」を最初に開き、全体状態を確認します。</p>
          <ul>
            <li>全体正常：緑表示なら基本問題なし</li>
            <li>警告あり：重要アラートとDocker要確認を確認</li>
            <li>サービス起動：統合監視のサービスランチャーから開く</li>
            <li>設定変更前：バックアップ画面でZIP Exportを保存</li>
          </ul>
        </section>

        <section id="devices" className="card">
          <h3>3. 機器管理</h3>
          <p>サーバー、PC、NAS、ネットワーク機器、仮想マシンなどを登録します。</p>
          <ol>
            <li>左メニューから「機器管理」を開きます。</li>
            <li>機器名、種別、メーカー、OS、説明を入力します。</li>
            <li>必要に応じてタグ、パーツ、インターフェース、URLを登録します。</li>
          </ol>
          <p>例：5950Proxmox、TrueNAS、Ubuntu Docker Host、Jellyfinサーバーなど。</p>
        </section>

        <section id="monitoring" className="card">
          <h3>4. 監視</h3>
          <p>Ping、HTTP、TCP、Dockerコンテナ監視を登録できます。</p>
          <ul>
            <li>Ping：IP疎通確認</li>
            <li>HTTP：Web UI確認</li>
            <li>TCP：SSH、SMB、Proxmox 8006などのポート確認</li>
            <li>Docker：コンテナの起動状態確認</li>
          </ul>
        </section>

        <section id="center" className="card">
          <h3>5. 統合監視センター</h3>
          <p>現在もっとも重要な運用画面です。</p>
          <ul>
            <li>Ubuntu Docker Host の稼働確認</li>
            <li>TrueNAS の SMB / WebUI 確認</li>
            <li>Proxmox の WebUI 確認</li>
            <li>Tailscale の利用状態確認</li>
            <li>Docker正常率、停止数、除外数の確認</li>
            <li>Jellyfin、Immich、Nextcloud、Homepage、Portainer等へのランチャー</li>
          </ul>
        </section>

        <section id="discovery" className="card">
          <h3>6. 自動検出</h3>
          <p>Dockerコンテナから主要サービスを自動判定します。</p>
          <p>検出対象例：Jellyfin、Immich、Nextcloud、Homepage、Portainer、Kavita、Paperless、Stirling PDF、Uptime Kuma、n8n。</p>
        </section>

        <section id="layout" className="card">
          <h3>7. 部屋・構成図・レイアウト</h3>
          <p>部屋写真に機器を配置したり、機器間の接続を構成図として管理できます。</p>
          <ul>
            <li>部屋管理：部屋情報を登録</li>
            <li>部屋レイアウト：写真上に機器を配置</li>
            <li>構成図：機器間の接続関係を確認</li>
            <li>ラックビュー：サーバーラック風に機器を整理</li>
          </ul>
        </section>

        <section id="backup" className="card">
          <h3>8. バックアップ</h3>
          <p>バックアップ画面から登録データをZIP形式でExportできます。</p>
          <p>バージョン更新前、機器を大量登録する前、構成変更前には必ず保存してください。</p>
          <pre><code>{`推奨タイミング：
- バージョン更新前
- Docker構成変更前
- TrueNAS/Proxmox構成変更前
- 写真や配置を大量追加した後`}</code></pre>
        </section>

        <section id="protection" className="card">
          <h3>9. データ保護</h3>
          <p>登録済み機器・写真・部屋情報・監視設定は <code>backend/app/data</code> に保存します。</p>
          <p>通常更新では <code>docker compose down -v</code> を使わず、<code>backend/app/data</code> を削除しないでください。</p>
          <p>大きな変更前は「バックアップ」画面からZIP Exportを保存してください。</p>
        </section>

        <section id="trouble" className="card">
          <h3>9. トラブル対応</h3>
          <h4>画面が古いままの場合</h4>
          <pre><code>{`Ctrl + F5 で強制更新`}</code></pre>
          <h4>コンテナ状態確認</h4>
          <pre><code>{`cd ~/homenet-map-jp
docker compose ps`}</code></pre>
          <h4>再起動</h4>
          <pre><code>{`docker compose down
docker compose up -d --build --force-recreate`}</code></pre>
          <h4>ログ確認</h4>
          <pre><code>{`docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend`}</code></pre>
        </section>

        <section id="update" className="card">
          <h3>10. 更新手順</h3>
          <p>Windows側でZIPを展開してGitHubへpushし、Ubuntu側でpull反映します。</p>
          <h4>Windows側</h4>
          <pre><code>{`cd $HOME\\Downloads
Expand-Archive .\\homenet-map-jp-mvp-vX.X.X.zip -DestinationPath .\\vXXX -Force
robocopy .\\vXXX\\homenet-map-jp .\\homenet-map-jp /E
cd .\\homenet-map-jp
git add .
git commit -m "Update HomeNet Map JP"
git push`}</code></pre>
          <h4>Ubuntu側</h4>
          <pre><code>{`cd ~/homenet-map-jp
git fetch origin
git reset --hard origin/main
docker compose down
docker compose up -d --build --force-recreate`}</code></pre>
        </section>
      
        <section id="v180" className="card">
          <h3>Ver1.8.0追記：データ保護と構成図フィルタ</h3>
          <p>Ver1.8.0では、データ保護画面と構成図の表示切替を強化しました。</p>
          <ul>
            <li>データ保護画面で登録部屋・登録機器・接続情報・監視設定の件数を確認できます。</li>
            <li>構成図で全体表示、部屋別表示、機器種別別表示を切り替えできます。</li>
            <li>クイックフィルタでネットワーク機器のみ、NAS/ストレージのみ、Proxmox/VM/サーバー系、PC系、Docker/Ubuntu系を表示できます。</li>
            <li>更新前は必ずUbuntu側で <code>backend/app/data</code> をバックアップしてください。</li>
          </ul>
          <pre><code>{`cd ~/homenet-map-jp
cp -a backend/app/data backend/app/data.backup.$(date +%Y%m%d_%H%M%S)`}</code></pre>
        </section>

      
        <section id="v181" className="card">
          <h3>Ver1.8.1追記：時刻表示の修正</h3>
          <p>APIがUTC時刻をタイムゾーン情報なしで返す場合、ブラウザがJSTとして解釈して9時間ずれる問題を修正しました。</p>
          <ul>
            <li>タイムゾーンなしのISO日時はUTCとして扱います。</li>
            <li>画面表示時にAsia/Tokyoへ変換します。</li>
            <li>サーバー/コンテナ時刻がJSTで正常でも、アプリ表示だけずれる問題に対応します。</li>
          </ul>
        </section>

      
        <section id="v182" className="card">
          <h3>Ver1.8.2追記：監視一覧の時刻修正</h3>
          <p>Ver1.8.1で未修正だった監視一覧の「最終確認」時刻をJST表示へ変換するよう修正しました。</p>
          <ul>
            <li>UTCのタイムゾーンなし日時をUTCとして解釈します。</li>
            <li>監視一覧・インフラ監視の最終確認表示をAsia/Tokyoへ変換します。</li>
          </ul>
        </section>

      
        <section id="v183" className="card">
          <h3>Ver1.8.3追記：監視一覧の最終確認を直接修正</h3>
          <p>監視一覧の「最終確認」列が別フィールドから描画されていたため、対応フィールドを追加してJST表示へ補正しました。</p>
        </section>

      
        <section id="v184" className="card">
          <h3>Ver1.8.4追記：時刻仕様の根本修正</h3>
          <p>フロント側の補正ではなく、Backend/API側で日時をJSTのタイムゾーン付きISO形式へ正規化する方針に変更しました。</p>
          <ul>
            <li>API日時は可能な限り <code>2026-06-12T20:35:00+09:00</code> の形式で返します。</li>
            <li>古いUTCタイムゾーンなし日時はBackend側でJSTへ変換します。</li>
            <li>確認用エンドポイント <code>/api/time-debug</code> を追加しました。</li>
          </ul>
        </section>

      </main>
    </div>
  </>;
}
