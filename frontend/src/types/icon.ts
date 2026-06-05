export type DeviceIcon = {
  value: string;
  label: string;
  mark: string;
};

export const DEVICE_ICONS: DeviceIcon[] = [
  { value: '', label: '未設定', mark: '❔' },
  { value: 'pc', label: 'Windows PC', mark: '🖥️' },
  { value: 'windows', label: 'Windows', mark: '🖥️' },
  { value: 'server', label: 'サーバー', mark: '🖧' },
  { value: 'nas', label: 'NAS', mark: '💾' },
  { value: 'network', label: 'ネットワーク機器', mark: '🔀' },
  { value: 'router', label: 'ルーター', mark: '📡' },
  { value: 'switch', label: 'スイッチ', mark: '🔀' },
  { value: 'wifi', label: 'Wi-Fi / AP', mark: '📶' },
  { value: 'iot', label: 'IoT', mark: '💡' },
  { value: 'vm', label: '仮想マシン', mark: '🧩' },
  { value: 'docker', label: 'Docker', mark: '🐳' },
  { value: 'container', label: 'コンテナ', mark: '🐳' },
  { value: 'ups', label: 'UPS', mark: '🔋' },
  { value: 'printer', label: 'プリンター', mark: '🖨️' },
  { value: 'storage', label: 'ストレージ', mark: '💽' },
  { value: 'phone', label: 'スマホ', mark: '📱' },
  { value: 'tablet', label: 'タブレット', mark: '📱' },
  { value: 'tv', label: 'テレビ / STB', mark: '📺' },
  { value: 'other', label: 'その他', mark: '📦' }
];

const normalize = (value?: string | null) =>
  (value || '').toString().trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

const aliases: Record<string, string> = {
  'windows_pc': 'pc',
  'windowspc': 'pc',
  'win_pc': 'pc',
  'desktop': 'pc',
  'computer': 'pc',
  'ubuntu': 'server',
  'linux': 'server',
  'home_server': 'server',
  'truenas': 'nas',
  'true_nas': 'nas',
  'synology': 'nas',
  'qnap': 'nas',
  'proxmox': 'server',
  'pve': 'server',
  'virtual_machine': 'vm',
  'virtual': 'vm',
  'docker_service': 'docker',
  'compose': 'docker',
  'container_service': 'container',
  'network_device': 'network',
  'ap': 'wifi',
  'access_point': 'wifi',
  'wireless': 'wifi',
  'hub': 'switch'
};

export function getDeviceIcon(icon?: string | null, deviceType?: string | null): DeviceIcon {
  const rawIcon = normalize(icon);
  const rawType = normalize(deviceType);
  const candidates = [rawIcon, aliases[rawIcon], rawType, aliases[rawType]].filter(Boolean) as string[];

  for (const key of candidates) {
    const found = DEVICE_ICONS.find(i => normalize(i.value) === key || normalize(i.label) === key);
    if (found) return found;
  }

  if (rawIcon.includes('pc') || rawType.includes('pc')) return DEVICE_ICONS.find(i=>i.value==='pc')!;
  if (rawIcon.includes('nas') || rawType.includes('nas')) return DEVICE_ICONS.find(i=>i.value==='nas')!;
  if (rawIcon.includes('server') || rawType.includes('server')) return DEVICE_ICONS.find(i=>i.value==='server')!;
  if (rawIcon.includes('docker') || rawType.includes('docker') || rawType.includes('container')) return DEVICE_ICONS.find(i=>i.value==='docker')!;
  if (rawIcon.includes('vm') || rawType.includes('vm')) return DEVICE_ICONS.find(i=>i.value==='vm')!;
  if (rawIcon.includes('router') || rawType.includes('router')) return DEVICE_ICONS.find(i=>i.value==='router')!;
  if (rawIcon.includes('switch') || rawType.includes('switch')) return DEVICE_ICONS.find(i=>i.value==='switch')!;
  if (rawIcon.includes('network') || rawType.includes('network')) return DEVICE_ICONS.find(i=>i.value==='network')!;
  if (rawIcon.includes('wifi') || rawType.includes('wifi')) return DEVICE_ICONS.find(i=>i.value==='wifi')!;

  return DEVICE_ICONS.find(i=>i.value==='other')!;
}
