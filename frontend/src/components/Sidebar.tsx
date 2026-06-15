import { Link } from 'react-router-dom';
import { APP_VERSION, APP_BUILD } from '../version';

const groups = [
  { title: 'メイン', items: [{ to: '/', label: 'ダッシュボード' }] },
  { title: '資産管理', items: [
    { to: '/rooms', label: '部屋' },
    { to: '/devices', label: '機器' },
    { to: '/urls', label: 'URL' },
    { to: '/tags', label: 'タグ' },
  ]},
  { title: '構成管理', items: [
    { to: '/diagram', label: '構成図' },
    { to: '/room-layout', label: '部屋レイアウト' },
    { to: '/racks', label: 'ラックビュー' },
  ]},
  { title: '監視', items: [
    { to: '/center', label: 'サービス監視' },
    { to: '/infra', label: 'インフラ監視' },
    { to: '/health', label: '健康状態' },
    { to: '/monitoring', label: '詳細監視' },
  ]},
  { title: '運用', items: [
    { to: '/discovery', label: '自動検出' },
    { to: '/backup', label: 'バックアップ' },
    { to: '/data-protection', label: 'データ保護' },
  ]},
  { title: 'ヘルプ', items: [
    { to: '/manual', label: 'マニュアル' },
    { to: '/settings', label: '設定' },
  ]},
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h1>HomeNet Map JP</h1>
      <nav className="nav grouped-nav">
        {groups.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-title">{group.title}</div>
            {group.items.map((item) => (
              <Link key={item.to} to={item.to}>{item.label}</Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-version">
        <div>Ver {APP_VERSION}</div>
        <div>{APP_BUILD}</div>
      </div>
    </aside>
  );
}
