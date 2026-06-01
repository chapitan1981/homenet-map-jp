export default function DashboardPage() {
  return (
    <>
      <h2>ダッシュボード</h2>
      <div className="grid">
        <div className="card"><h3>機器</h3><p>登録機器を管理します。</p></div>
        <div className="card"><h3>部屋</h3><p>部屋ごとの機器配置を管理します。</p></div>
        <div className="card"><h3>構成図</h3><p>React Flowで拡張可能な構成図を作成します。</p></div>
        <div className="card"><h3>バックアップ</h3><p>JSON形式でデータを出力します。</p></div>
      </div>
    </>
  );
}
