export type DeviceIconOption = { value: string; label: string; emoji: string };

export const DEVICE_ICON_OPTIONS: DeviceIconOption[] = [
  { value: 'router', label: 'ルーター', emoji: '📡' },
  { value: 'switch', label: 'スイッチ/HUB', emoji: '🔀' },
  { value: 'hub', label: 'HUB', emoji: '🔀' },
  { value: 'wifi', label: 'Wi-Fi/AP', emoji: '📶' },
  { value: 'firewall', label: 'ファイアウォール', emoji: '🛡️' },
  { value: 'desktop', label: 'デスクトップPC', emoji: '🖥️' },
  { value: 'laptop', label: 'ノートPC', emoji: '💻' },
  { value: 'pc', label: 'PC', emoji: '💻' },
  { value: 'server', label: 'サーバー', emoji: '🖥️' },
  { value: 'mini-pc', label: 'ミニPC', emoji: '🧊' },
  { value: 'nas', label: 'NAS', emoji: '🗄️' },
  { value: 'storage', label: 'ストレージ', emoji: '💾' },
  { value: 'hdd', label: 'HDD', emoji: '💾' },
  { value: 'ssd', label: 'SSD', emoji: '💽' },
  { value: 'backup', label: 'バックアップ', emoji: '🧰' },
  { value: 'vm', label: '仮想マシン', emoji: '🧩' },
  { value: 'container', label: 'コンテナ', emoji: '📦' },
  { value: 'docker', label: 'Docker', emoji: '🐳' },
  { value: 'camera', label: 'カメラ', emoji: '📷' },
  { value: 'printer', label: 'プリンター', emoji: '🖨️' },
  { value: 'tv', label: 'テレビ', emoji: '📺' },
  { value: 'game', label: 'ゲーム機', emoji: '🎮' },
  { value: 'phone', label: 'スマホ', emoji: '📱' },
  { value: 'tablet', label: 'タブレット', emoji: '📱' },
  { value: 'ups', label: 'UPS', emoji: '🔋' },
  { value: 'power', label: '電源/コンセント', emoji: '🔌' },
  { value: 'rack', label: 'ラック', emoji: '🗃️' },
  { value: 'cable', label: 'ケーブル', emoji: '🔗' },
  { value: 'other', label: 'その他', emoji: '🔧' },
];

export function deviceIcon(icon?: string, deviceType?: string, name?: string): string {
  const raw = (icon || '').trim();
  if (raw && [...raw].length <= 3 && !/^[a-z0-9_-]+$/i.test(raw)) return raw;

  const key = (raw || deviceType || name || '').toLowerCase();
  const direct = DEVICE_ICON_OPTIONS.find(opt => opt.value === key);
  if (direct) return direct.emoji;

  const alias: Record<string, string> = {
    network: '🔀', switchhub: '🔀', l2switch: '🔀', l3switch: '🔀',
    ap: '📶', accesspoint: '📶',
    desktoppc: '🖥️', notebook: '💻', notebookpc: '💻',
    mini: '🧊', minipc: '🧊',
    truenas: '🗄️', proxmox: '🖥️',
    ubuntu: '🐧', linux: '🐧', windows: '🪟',
  };
  if (alias[key]) return alias[key];

  if (key.includes('router')) return '📡';
  if (key.includes('hub') || key.includes('switch')) return '🔀';
  if (key.includes('wifi') || key.includes('wi-fi') || key.includes('ap')) return '📶';
  if (key.includes('firewall')) return '🛡️';
  if (key.includes('laptop') || key.includes('note')) return '💻';
  if (key.includes('desktop') || key.includes('ryzen') || key.includes('pc')) return '🖥️';
  if (key.includes('server') || key.includes('proxmox')) return '🖥️';
  if (key.includes('nas') || key.includes('truenas')) return '🗄️';
  if (key.includes('hdd') || key.includes('storage')) return '💾';
  if (key.includes('ssd')) return '💽';
  if (key.includes('docker')) return '🐳';
  if (key.includes('container')) return '📦';
  if (key.includes('vm')) return '🧩';
  return '🖥️';
}

export function iconLabel(value?: string): string {
  const option = DEVICE_ICON_OPTIONS.find(opt => opt.value === value);
  return option ? `${option.emoji} ${option.label}` : `${deviceIcon(value)} ${value || '自動'}`;
}
