export function deviceIcon(icon?: string, deviceType?: string, name?: string): string {
  const key = (icon || deviceType || name || '').toLowerCase();

  const map: Record<string, string> = {
    server: '🖥️',
    pc: '💻',
    desktop: '🖥️',
    laptop: '💻',
    nas: '🗄️',
    storage: '💾',
    hdd: '💾',
    ssd: '💽',
    network: '🌐',
    router: '📡',
    switch: '🔀',
    hub: '🔀',
    wifi: '📶',
    ap: '📶',
    firewall: '🛡️',
    vm: '🧩',
    container: '📦',
    docker: '🐳',
    camera: '📷',
    printer: '🖨️',
    tv: '📺',
    game: '🎮',
    phone: '📱',
    tablet: '📱',
    ups: '🔋',
    power: '🔌',
    other: '🔧',
  };

  if (map[key]) return map[key];

  if (key.includes('proxmox')) return '🖥️';
  if (key.includes('truenas') || key.includes('nas')) return '🗄️';
  if (key.includes('hub') || key.includes('switch')) return '🔀';
  if (key.includes('router')) return '📡';
  if (key.includes('wifi') || key.includes('ap')) return '📶';
  if (key.includes('ryzen') || key.includes('pc')) return '💻';

  // If user saved an emoji directly as icon, use it.
  if ([...key].length <= 3 && icon) return icon;

  return '🖥️';
}
