import { Link } from 'react-router-dom';

export default function DataProtectionPage(){
  return <>
    <div className="page-title-row">
      <h2>データ保護</h2>
      <div className="page-actions">
        <Link className="small-button" to="/backup">バックアップ</Link>
        <Link className="small-button" to="/manual">マニュアル</Link>
      </div>
    </div>

    <div className="manual-hero">
      <div>
        <span>Ver1.5.0</span>
        <strong>更新でデータを消さないための設計</strong>
        <p>機器・部屋・写真・配置・監視データを守るためのルールをまとめています。</p>
      </div>
    </div>

    <div className="manual-content">
      <section className="card">
        <h3>保護対象</h3>
        <ul>
          <li>登録済み機器、部屋、接続、構成図、配置情報</li>
          <li>機器写真、部屋写真、アップロードファイル</li>
          <li>監視設定、登録URL、バックアップ情報</li>
        </ul>
      </section>

      <section className="card">
        <h3>重要な仕組み</h3>
        <p>DBと写真はホスト側の <code>backend/app/data</code> に保存します。</p>
        <pre><code>{`./backend/app/data:/app/app/data`}</code></pre>
        <p>このbind mountを維持していれば、コンテナを作り直してもデータは残ります。</p>
      </section>

      <section className="card warning-card">
        <h3>やってはいけないこと</h3>
        <ul>
          <li><code>docker compose down -v</code> を通常更新で使わない</li>
          <li><code>backend/app/data</code> を削除しない</li>
          <li><code>robocopy /MIR</code> で更新しない</li>
          <li>空のDBで既存DBを上書きしない</li>
        </ul>
      </section>

      <section className="card">
        <h3>安全な更新前バックアップ</h3>
        <pre><code>{`cd ~/homenet-map-jp
cp -a backend/app/data backend/app/data.backup.$(date +%Y%m%d_%H%M%S)`}</code></pre>
      </section>

      <section className="card">
        <h3>通常更新</h3>
        <pre><code>{`git fetch origin
git reset --hard origin/main
docker compose down
docker compose up -d --build --force-recreate`}</code></pre>
      </section>
    </div>
  </>;
}
