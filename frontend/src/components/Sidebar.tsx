import { NavLink } from 'react-router-dom';
import { APP_VERSION, APP_BUILD } from '../version';

const navItems = [
  { path: '/', label: 'ダッシュボード' },
  { path: '/rooms', label: '部屋管理' },
  { path: '/devices', label: '機器管理' },
  { path: '/monitor-center', label: '統合監視' },
  { path: '/infrastructure', label: 'インフラ監視' },
  { path: '/stable', label: 'Stable' },
  { path: '/auto-discovery', label: '自動検出' },
  { path: '/network-scan', label: 'ネットワークスキャン' },
  { path: '/homelab', label: 'ホームラボ' },
  { path: '/health', label: '健康状態' },
  { path: '/monitoring', label: '監視' },
  { path: '/diagram', label: '構成図' },
  { path: '/room-layout', label: '部屋レイアウト' },
  { path: '/backup', label: 'バックアップ' },
  { path: '/rack', label: 'ラックビュー' },
  { path: '/data-protection', label: 'データ保護' },
  { path: '/manual', label: 'マニュアル' },
  { path: '/settings', label: '設定' },
];

export default function Sidebar(){
  return <aside className="sidebar">
    <h1>HomeNet Map JP</h1>
    <nav>
      {navItems.map(item => (
        <NavLink key={item.path} to={item.path} className={({isActive})=>isActive?'active':''}>
          {item.label}
        </NavLink>
      ))}
    </nav>
    <div className="version-box">
      <div>Ver {APP_VERSION}</div>
      <small>{APP_BUILD}</small>
    </div>
  </aside>;
}
