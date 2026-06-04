export type CustomFieldPreset = {
  field_name: string;
  field_type: 'text' | 'textarea' | 'url' | 'date' | 'number';
  field_value: string;
  sort_order: number;
  note: string;
};

export type DeviceTemplate = {
  id: string;
  label: string;
  description: string;
  device_type: string;
  icon: string;
  fields: CustomFieldPreset[];
};

export const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    id: 'home-server',
    label: 'ホームサーバー / Ubuntu',
    description: 'Ubuntu / Docker / Tailscale で動く自宅サーバー向け',
    device_type: 'server',
    icon: 'server',
    fields: [
      { field_name: 'LAN IP', field_type: 'text', field_value: '', sort_order: 10, note: '' },
      { field_name: 'Tailscale IP', field_type: 'text', field_value: '', sort_order: 20, note: '' },
      { field_name: 'Hostname', field_type: 'text', field_value: '', sort_order: 30, note: '' },
      { field_name: 'SSH接続', field_type: 'text', field_value: 'ssh user@IP', sort_order: 40, note: '' },
      { field_name: '管理URL', field_type: 'url', field_value: '', sort_order: 50, note: '' },
      { field_name: 'Docker Composeパス', field_type: 'text', field_value: '', sort_order: 60, note: '' },
      { field_name: '設置場所', field_type: 'text', field_value: '', sort_order: 70, note: '' },
      { field_name: '用途', field_type: 'textarea', field_value: '', sort_order: 80, note: '' }
    ]
  },
  {
    id: 'nas',
    label: 'NAS / TrueNAS',
    description: 'TrueNAS / SMB / ZFS / 共有フォルダ管理向け',
    device_type: 'nas',
    icon: 'nas',
    fields: [
      { field_name: 'LAN IP', field_type: 'text', field_value: '', sort_order: 10, note: '' },
      { field_name: '管理URL', field_type: 'url', field_value: '', sort_order: 20, note: '' },
      { field_name: 'SMB共有', field_type: 'textarea', field_value: '', sort_order: 30, note: '' },
      { field_name: 'プール構成', field_type: 'textarea', field_value: '', sort_order: 40, note: '' },
      { field_name: 'バックアップ先', field_type: 'textarea', field_value: '', sort_order: 50, note: '' },
      { field_name: '設置場所', field_type: 'text', field_value: '', sort_order: 60, note: '' }
    ]
  },
  {
    id: 'windows-pc',
    label: 'Windows PC',
    description: 'メインPC / 録画PC / AI画像生成PC向け',
    device_type: 'pc',
    icon: 'pc',
    fields: [
      { field_name: 'LAN IP', field_type: 'text', field_value: '', sort_order: 10, note: '' },
      { field_name: 'Tailscale IP', field_type: 'text', field_value: '', sort_order: 20, note: '' },
      { field_name: 'CPU', field_type: 'text', field_value: '', sort_order: 30, note: '' },
      { field_name: 'メモリ', field_type: 'text', field_value: '', sort_order: 40, note: '' },
      { field_name: 'GPU', field_type: 'text', field_value: '', sort_order: 50, note: '' },
      { field_name: 'ストレージ', field_type: 'textarea', field_value: '', sort_order: 60, note: '' },
      { field_name: '用途', field_type: 'textarea', field_value: '', sort_order: 70, note: '' }
    ]
  },
  {
    id: 'docker-service',
    label: 'Dockerサービス',
    description: 'Jellyfin / Nextcloud / Immich / Homepage などのコンテナ向け',
    device_type: 'container',
    icon: 'docker',
    fields: [
      { field_name: 'サービスURL', field_type: 'url', field_value: '', sort_order: 10, note: '' },
      { field_name: 'Tailscale URL', field_type: 'url', field_value: '', sort_order: 20, note: '' },
      { field_name: 'Composeファイル', field_type: 'text', field_value: '', sort_order: 30, note: '' },
      { field_name: 'ホスト名', field_type: 'text', field_value: '', sort_order: 40, note: '' },
      { field_name: '公開ポート', field_type: 'text', field_value: '', sort_order: 50, note: '' },
      { field_name: 'データ保存先', field_type: 'text', field_value: '', sort_order: 60, note: '' }
    ]
  },
  {
    id: 'vm',
    label: '仮想マシン / Proxmox VM',
    description: 'Proxmox / Hyper-V / VMware 上のVM向け',
    device_type: 'vm',
    icon: 'vm',
    fields: [
      { field_name: 'ホスト', field_type: 'text', field_value: '', sort_order: 10, note: '' },
      { field_name: 'VM ID', field_type: 'text', field_value: '', sort_order: 20, note: '' },
      { field_name: 'LAN IP', field_type: 'text', field_value: '', sort_order: 30, note: '' },
      { field_name: 'Tailscale IP', field_type: 'text', field_value: '', sort_order: 40, note: '' },
      { field_name: 'CPU割当', field_type: 'text', field_value: '', sort_order: 50, note: '' },
      { field_name: 'メモリ割当', field_type: 'text', field_value: '', sort_order: 60, note: '' },
      { field_name: '管理URL', field_type: 'url', field_value: '', sort_order: 70, note: '' }
    ]
  },
  {
    id: 'network-device',
    label: 'ネットワーク機器',
    description: 'ルーター / スイッチ / AP / ONU 向け',
    device_type: 'network',
    icon: 'network',
    fields: [
      { field_name: 'LAN IP', field_type: 'text', field_value: '', sort_order: 10, note: '' },
      { field_name: '管理URL', field_type: 'url', field_value: '', sort_order: 20, note: '' },
      { field_name: '設置場所', field_type: 'text', field_value: '', sort_order: 30, note: '' },
      { field_name: 'ポート構成', field_type: 'textarea', field_value: '', sort_order: 40, note: '' },
      { field_name: 'VLAN', field_type: 'textarea', field_value: '', sort_order: 50, note: '' },
      { field_name: 'メモ', field_type: 'textarea', field_value: '', sort_order: 60, note: '' }
    ]
  }
];
