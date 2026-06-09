import { Link } from 'react-router-dom';
import { APP_VERSION, APP_BUILD } from '../version';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>HomeNet Map JP</h1>
      <nav className="nav">
        <Link to="/">ダッシュボード</Link>
        <Link to="/rooms">部屋管理</Link>
        <Link to="/devices">機器管理</Link>
        <Link to="/infra">インフラ監視</Link>
        <Link to="/stable">Stable</Link>
        <Link to="/discovery">自動検出</Link>
        <Link to="/homelab">ホームラボ</Link>
        <Link to="/health">健康状態</Link>
        <Link to="/monitoring">監視</Link>
        <Link to="/diagram">構成図</Link>
        <Link to="/room-layout">部屋レイアウト</Link>
        <Link to="/backup">バックアップ</Link>
        <Link to="/racks">ラックビュー</Link>
        <Link to="/settings">設定</Link>
      </nav>
    <div className="sidebar-version">
          <div>Ver {APP_VERSION}</div>
          <div>{APP_BUILD}</div>
        </div>
      </aside>
  );
}
