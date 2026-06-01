import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>HomeNet Map JP</h1>
      <nav className="nav">
        <Link to="/">ダッシュボード</Link>
        <Link to="/rooms">部屋管理</Link>
        <Link to="/devices">機器管理</Link>
        <Link to="/diagram">構成図</Link>
        <Link to="/backup">バックアップ</Link>
        <Link to="/settings">設定</Link>
      </nav>
    </aside>
  );
}
