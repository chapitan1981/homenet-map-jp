import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState({
    name: '',
    device_type: 'pc',
    vendor: '',
    model: '',
    os_name: '',
    description: '',
    icon: ''
  });

  const load = async () => {
    const res = await api.get('/devices');
    setDevices(res.data);
  };

  const submit = async () => {
    if (!form.name) return;
    await api.post('/devices', form);
    setForm({ name: '', device_type: 'pc', vendor: '', model: '', os_name: '', description: '', icon: '' });
    await load();
  };

  const remove = async (id: number) => {
    if (!confirm('この機器を削除しますか？')) return;
    await api.delete(`/devices/${id}`);
    await load();
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <h2>機器管理</h2>
      <div className="card form">
        <input placeholder="機器名 例: RTX5070 メインPC" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <select value={form.device_type} onChange={e => setForm({...form, device_type: e.target.value})}>
          <option value="pc">PC</option>
          <option value="server">サーバー</option>
          <option value="nas">NAS</option>
          <option value="network">ネットワーク機器</option>
          <option value="iot">IoT</option>
          <option value="vm">仮想マシン</option>
          <option value="container">Dockerコンテナ</option>
        </select>
        <input placeholder="メーカー" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
        <input placeholder="型番" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
        <input placeholder="OS" value={form.os_name} onChange={e => setForm({...form, os_name: e.target.value})} />
        <textarea placeholder="説明" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <button onClick={submit}>機器を追加</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>名前</th><th>種別</th><th>メーカー</th><th>OS</th><th>操作</th></tr></thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td><Link className="text-link" to={`/devices/${d.id}`}>{d.name}</Link></td>
                <td>{d.device_type}</td>
                <td>{d.vendor}</td>
                <td>{d.os_name}</td>
                <td>
                  <Link className="small-button" to={`/devices/${d.id}`}>詳細</Link>
                  <button className="danger-button" onClick={() => remove(d.id)}>削除</button>
                </td>
              </tr>
            ))}
            {devices.length === 0 && <tr><td colSpan={6}>機器未登録</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
