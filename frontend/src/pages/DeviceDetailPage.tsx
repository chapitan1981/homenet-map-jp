import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';

type Part = {
  id: number;
  device_id: number;
  part_type: string;
  vendor: string;
  model: string;
  spec: string;
  quantity: number;
  note: string;
};

type Nic = {
  id: number;
  device_id: number;
  interface_name: string;
  ip_address: string;
  mac_address: string;
  network_type: string;
  is_primary: boolean;
  last_seen_at: string;
};

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = Number(params.id);
  const [device, setDevice] = useState<Device | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [interfaces, setInterfaces] = useState<Nic[]>([]);

  const [partForm, setPartForm] = useState({
    part_type: 'CPU',
    vendor: '',
    model: '',
    spec: '',
    quantity: 1,
    note: ''
  });

  const [nicForm, setNicForm] = useState({
    interface_name: 'eth0',
    ip_address: '',
    mac_address: '',
    network_type: 'LAN',
    is_primary: true,
    last_seen_at: ''
  });

  const load = async () => {
    const [d, p, n] = await Promise.all([
      api.get(`/devices/${deviceId}`),
      api.get(`/devices/${deviceId}/parts`),
      api.get(`/devices/${deviceId}/interfaces`)
    ]);
    setDevice(d.data);
    setParts(p.data);
    setInterfaces(n.data);
  };

  const addPart = async () => {
    if (!partForm.part_type) return;
    await api.post(`/devices/${deviceId}/parts`, partForm);
    setPartForm({ part_type: 'CPU', vendor: '', model: '', spec: '', quantity: 1, note: '' });
    await load();
  };

  const deletePart = async (partId: number) => {
    if (!confirm('このパーツを削除しますか？')) return;
    await api.delete(`/parts/${partId}`);
    await load();
  };

  const addNic = async () => {
    await api.post(`/devices/${deviceId}/interfaces`, nicForm);
    setNicForm({ interface_name: 'eth0', ip_address: '', mac_address: '', network_type: 'LAN', is_primary: true, last_seen_at: '' });
    await load();
  };

  const deleteNic = async (nicId: number) => {
    if (!confirm('このネットワーク情報を削除しますか？')) return;
    await api.delete(`/interfaces/${nicId}`);
    await load();
  };

  useEffect(() => { if (deviceId) load(); }, [deviceId]);

  if (!device) {
    return (
      <>
        <h2>機器詳細</h2>
        <div className="card">読み込み中...</div>
      </>
    );
  }

  return (
    <>
      <div className="page-title-row">
        <h2>機器詳細：{device.name}</h2>
        <Link className="small-button" to="/devices">機器一覧へ戻る</Link>
      </div>

      <div className="grid">
        <div className="card">
          <h3>基本情報</h3>
          <dl className="detail-list">
            <dt>名前</dt><dd>{device.name}</dd>
            <dt>種別</dt><dd>{device.device_type}</dd>
            <dt>メーカー</dt><dd>{device.vendor || '-'}</dd>
            <dt>型番</dt><dd>{device.model || '-'}</dd>
            <dt>OS</dt><dd>{device.os_name || '-'}</dd>
            <dt>説明</dt><dd>{device.description || '-'}</dd>
          </dl>
        </div>

        <div className="card">
          <h3>管理メモ</h3>
          <p>PC本体・サーバー・NASの内部構成を登録できます。</p>
          <p>将来的に自動スキャン結果と手動入力情報をマージします。</p>
        </div>
      </div>

      <div className="card">
        <h3>パーツ登録</h3>
        <div className="inline-form">
          <select value={partForm.part_type} onChange={e => setPartForm({...partForm, part_type: e.target.value})}>
            <option value="CPU">CPU</option>
            <option value="Memory">メモリ</option>
            <option value="GPU">GPU</option>
            <option value="Motherboard">マザーボード</option>
            <option value="SSD">SSD</option>
            <option value="HDD">HDD</option>
            <option value="PowerSupply">電源</option>
            <option value="Case">ケース</option>
            <option value="NIC">NIC</option>
            <option value="Other">その他</option>
          </select>
          <input placeholder="メーカー" value={partForm.vendor} onChange={e => setPartForm({...partForm, vendor: e.target.value})} />
          <input placeholder="型番" value={partForm.model} onChange={e => setPartForm({...partForm, model: e.target.value})} />
          <input placeholder="仕様 例: 8C/16T, 64GB, 2TB" value={partForm.spec} onChange={e => setPartForm({...partForm, spec: e.target.value})} />
          <input type="number" min="1" placeholder="数量" value={partForm.quantity} onChange={e => setPartForm({...partForm, quantity: Number(e.target.value)})} />
          <input placeholder="メモ" value={partForm.note} onChange={e => setPartForm({...partForm, note: e.target.value})} />
          <button onClick={addPart}>追加</button>
        </div>

        <table className="table">
          <thead><tr><th>種別</th><th>メーカー</th><th>型番</th><th>仕様</th><th>数量</th><th>メモ</th><th>操作</th></tr></thead>
          <tbody>
            {parts.map(p => (
              <tr key={p.id}>
                <td>{p.part_type}</td>
                <td>{p.vendor}</td>
                <td>{p.model}</td>
                <td>{p.spec}</td>
                <td>{p.quantity}</td>
                <td>{p.note}</td>
                <td><button className="danger-button" onClick={() => deletePart(p.id)}>削除</button></td>
              </tr>
            ))}
            {parts.length === 0 && <tr><td colSpan={7}>パーツ未登録</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>ネットワーク情報</h3>
        <div className="inline-form">
          <input placeholder="IF名 例: eth0 / Wi-Fi" value={nicForm.interface_name} onChange={e => setNicForm({...nicForm, interface_name: e.target.value})} />
          <input placeholder="IPアドレス" value={nicForm.ip_address} onChange={e => setNicForm({...nicForm, ip_address: e.target.value})} />
          <input placeholder="MACアドレス" value={nicForm.mac_address} onChange={e => setNicForm({...nicForm, mac_address: e.target.value})} />
          <select value={nicForm.network_type} onChange={e => setNicForm({...nicForm, network_type: e.target.value})}>
            <option value="LAN">LAN</option>
            <option value="Wi-Fi">Wi-Fi</option>
            <option value="Tailscale">Tailscale</option>
            <option value="VPN">VPN</option>
          </select>
          <button onClick={addNic}>追加</button>
        </div>

        <table className="table">
          <thead><tr><th>IF名</th><th>IP</th><th>MAC</th><th>種別</th><th>優先</th><th>操作</th></tr></thead>
          <tbody>
            {interfaces.map(n => (
              <tr key={n.id}>
                <td>{n.interface_name}</td>
                <td>{n.ip_address}</td>
                <td>{n.mac_address}</td>
                <td>{n.network_type}</td>
                <td>{n.is_primary ? 'Yes' : 'No'}</td>
                <td><button className="danger-button" onClick={() => deleteNic(n.id)}>削除</button></td>
              </tr>
            ))}
            {interfaces.length === 0 && <tr><td colSpan={6}>ネットワーク情報未登録</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
