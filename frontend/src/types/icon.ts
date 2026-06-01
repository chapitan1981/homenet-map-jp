export const DEVICE_ICONS = [
  { value: '', label: '未設定', mark: '❔' },
  { value: 'windows', label: 'Windows PC', mark: '🖥️' },
  { value: 'ubuntu', label: 'Ubuntu', mark: '🐧' },
  { value: 'truenas', label: 'TrueNAS', mark: '💾' },
  { value: 'docker', label: 'Docker', mark: '🐳' },
  { value: 'hyperv', label: 'Hyper-V', mark: '🧩' },
  { value: 'router', label: 'Router', mark: '🌐' },
  { value: 'switch', label: 'Switch', mark: '🔀' },
  { value: 'wifi', label: 'Wi-Fi AP', mark: '📶' },
  { value: 'nas', label: 'NAS', mark: '🗄️' },
  { value: 'tv', label: 'TV', mark: '📺' },
  { value: 'android', label: 'Android', mark: '🤖' },
  { value: 'iphone', label: 'iPhone', mark: '📱' },
  { value: 'printer', label: 'Printer', mark: '🖨️' },
  { value: 'camera', label: 'Camera', mark: '📷' },
  { value: 'iot', label: 'IoT', mark: '💡' }
];

export function getDeviceIcon(value?: string) {
  return DEVICE_ICONS.find(i => i.value === value) || DEVICE_ICONS[0];
}
