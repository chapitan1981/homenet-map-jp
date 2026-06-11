export type DeviceIconOption = { value: string; label: string; emoji: string; group?: string };

export const DEVICE_ICON_OPTIONS: DeviceIconOption[] = [
  { value: 'router', label: 'ルーター', emoji: '📡', group: 'ネットワーク' },
  { value: 'switch', label: 'スイッチ', emoji: '🔀', group: 'ネットワーク' },
  { value: 'hub', label: 'HUB', emoji: '🔀', group: 'ネットワーク' },
  { value: '10gbe-switch', label: '10GbEスイッチ', emoji: '⚡', group: 'ネットワーク' },
  { value: 'wifi', label: 'Wi-Fi', emoji: '📶', group: 'ネットワーク' },
  { value: 'ap', label: 'アクセスポイント', emoji: '📶', group: 'ネットワーク' },
  { value: 'firewall', label: 'ファイアウォール', emoji: '🛡️', group: 'ネットワーク' },
  { value: 'modem', label: 'モデム/ONU', emoji: '🌐', group: 'ネットワーク' },
  { value: 'lan', label: 'LAN', emoji: '🔌', group: 'ネットワーク' },
  { value: 'vpn', label: 'VPN/Tailscale', emoji: '🔐', group: 'ネットワーク' },

  { value: 'desktop', label: 'デスクトップPC', emoji: '🖥️', group: 'PC/サーバー' },
  { value: 'laptop', label: 'ノートPC', emoji: '💻', group: 'PC/サーバー' },
  { value: 'pc', label: 'PC', emoji: '💻', group: 'PC/サーバー' },
  { value: 'workstation', label: 'ワークステーション', emoji: '🖥️', group: 'PC/サーバー' },
  { value: 'server', label: 'サーバー', emoji: '🗄️', group: 'PC/サーバー' },
  { value: 'rack-server', label: 'ラックサーバー', emoji: '🏢', group: 'PC/サーバー' },
  { value: 'mini-pc', label: 'ミニPC', emoji: '🧊', group: 'PC/サーバー' },
  { value: 'raspberry-pi', label: 'Raspberry Pi', emoji: '🍓', group: 'PC/サーバー' },
  { value: 'proxmox', label: 'Proxmox', emoji: '🖥️', group: 'PC/サーバー' },
  { value: 'ubuntu', label: 'Ubuntu/Linux', emoji: '🐧', group: 'PC/サーバー' },
  { value: 'windows', label: 'Windows', emoji: '🪟', group: 'PC/サーバー' },

  { value: 'nas', label: 'NAS', emoji: '🗄️', group: 'ストレージ' },
  { value: 'truenas', label: 'TrueNAS', emoji: '🗄️', group: 'ストレージ' },
  { value: 'storage', label: 'ストレージ', emoji: '💾', group: 'ストレージ' },
  { value: 'hdd', label: 'HDD', emoji: '💾', group: 'ストレージ' },
  { value: 'ssd', label: 'SSD', emoji: '💽', group: 'ストレージ' },
  { value: 'nvme', label: 'NVMe', emoji: '💽', group: 'ストレージ' },
  { value: 'backup', label: 'バックアップ', emoji: '🧰', group: 'ストレージ' },
  { value: 'database', label: 'データベース', emoji: '🗃️', group: 'ストレージ' },

  { value: 'vm', label: '仮想マシン', emoji: '🧩', group: '仮想化' },
  { value: 'container', label: 'コンテナ', emoji: '📦', group: '仮想化' },
  { value: 'docker', label: 'Docker', emoji: '🐳', group: '仮想化' },
  { value: 'kubernetes', label: 'Kubernetes', emoji: '☸️', group: '仮想化' },
  { value: 'hypervisor', label: 'ハイパーバイザー', emoji: '🧠', group: '仮想化' },

  { value: 'camera', label: 'カメラ', emoji: '📷', group: '周辺機器' },
  { value: 'printer', label: 'プリンター', emoji: '🖨️', group: '周辺機器' },
  { value: 'scanner', label: 'スキャナー', emoji: '📠', group: '周辺機器' },
  { value: 'tv', label: 'テレビ', emoji: '📺', group: '周辺機器' },
  { value: 'recorder', label: '録画機/チューナー', emoji: '📡', group: '周辺機器' },
  { value: 'game', label: 'ゲーム機', emoji: '🎮', group: '周辺機器' },
  { value: 'phone', label: 'スマホ', emoji: '📱', group: '周辺機器' },
  { value: 'tablet', label: 'タブレット', emoji: '📱', group: '周辺機器' },
  { value: 'iot', label: 'IoT', emoji: '💡', group: '周辺機器' },
  { value: 'sensor', label: 'センサー', emoji: '🌡️', group: '周辺機器' },

  { value: 'ups', label: 'UPS', emoji: '🔋', group: '電源/物理' },
  { value: 'power', label: '電源/コンセント', emoji: '🔌', group: '電源/物理' },
  { value: 'rack', label: 'ラック', emoji: '🗃️', group: '電源/物理' },
  { value: 'cable', label: 'ケーブル', emoji: '🔗', group: '電源/物理' },
  { value: 'fan', label: 'ファン/冷却', emoji: '🌀', group: '電源/物理' },
  { value: 'room', label: '部屋/保管場所', emoji: '🏠', group: '電源/物理' },
  { value: 'other', label: 'その他', emoji: '🔧', group: 'その他' },
];

export function deviceIcon(icon?: string, deviceType?: string, name?: string): string {
  const raw = (icon || '').trim();
  if (raw && [...raw].length <= 3 && !/^[a-z0-9_-]+$/i.test(raw)) return raw;

  const key = (raw || deviceType || name || '').toLowerCase();
  const direct = DEVICE_ICON_OPTIONS.find(opt => opt.value === key);
  if (direct) return direct.emoji;

  const alias: Record<string, string> = {
    network: '🔀', switchhub: '🔀', l2switch: '🔀', l3switch: '🔀',
    ap: '📶', accesspoint: '📶', onu: '🌐',
    desktoppc: '🖥️', notebook: '💻', notebookpc: '💻',
    mini: '🧊', minipc: '🧊',
    truenas: '🗄️', proxmox: '🖥️',
    ubuntu: '🐧', linux: '🐧', windows: '🪟',
  };
  if (alias[key]) return alias[key];

  if (key.includes('10g') || key.includes('10gbe')) return '⚡';
  if (key.includes('router')) return '📡';
  if (key.includes('hub') || key.includes('switch')) return '🔀';
  if (key.includes('wifi') || key.includes('wi-fi') || key.includes('ap')) return '📶';
  if (key.includes('firewall')) return '🛡️';
  if (key.includes('vpn') || key.includes('tailscale')) return '🔐';

  if (key.includes('laptop') || key.includes('note')) return '💻';
  if (key.includes('desktop') || key.includes('ryzen') || key.includes('pc')) return '🖥️';
  if (key.includes('server') || key.includes('proxmox')) return '🖥️';
  if (key.includes('raspberry')) return '🍓';

  if (key.includes('nas') || key.includes('truenas')) return '🗄️';
  if (key.includes('hdd') || key.includes('storage')) return '💾';
  if (key.includes('ssd') || key.includes('nvme')) return '💽';

  if (key.includes('docker')) return '🐳';
  if (key.includes('container')) return '📦';
  if (key.includes('vm')) return '🧩';

  return '🖥️';
}
