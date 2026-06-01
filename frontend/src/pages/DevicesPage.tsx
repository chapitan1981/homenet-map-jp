import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';
import { DEVICE_ICONS, getDeviceIcon } from '../types/icon';

const emptyForm = { name: '', device_type: 'pc', vendor: '', model: '', os_name: '', description: '', icon: '' };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    const params: any = {};
    if (keyword) params.keyword = keyword;
    if (typeFilter) params.device_type = typeFilter;
    setDevices((await api.get('/devices', { params })).data);
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const submit = async () => {
    if (!form.name) return;
    editingId ? await api.put(`/devices/${editingId}`, form) : await api.post('/devices', form);
    reset();
    load();
  };

  const edit = (d: Device) => {
    setEditingId(d.id);
    setForm({ name: d.name || '', device_type: d.device_type || 'pc', vendor: d.vendor || '', model: d.model || '', os_name: d.os_name || '', description: d.description || '', icon: d.icon || '' });
  };

  const remove = async (id: number) => {
    if (!confirm('この機器を削除しますか？')) return;
    await api.delete(`/devices/${id}`);
    load();
  };

  return (
    <>
      <h2>機器管理</h2>
      <div className="card">
        <h3>検索</h3>
        <div className="inline-form">
          <input placeholder="検索キーワード" value={keyword} onChange={e => setKeyword(e.target.value)} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">すべて</option><option value="pc">PC</option><option value="server">サーバー</option><option value="nas">NAS</option><option value="network">ネットワーク機器</option><option value="iot">IoT</option><option value="vm">仮想マシン</option><option value="container">Dockerコンテナ</option>
          </select>
          <button onClick={load}>検索</button>
          <button className="secondary-button" onClick={() => { setKeyword(''); setTypeFilter(''); }}>クリア</button>
        </div>
      </div>
      <div className="card form">
        <h3>{editingId ? '機器を編集' : '機器を追加'}</h3>
        <input placeholder="機器名" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <select value={form.device_type} onChange={e => setForm({...form, device_type: e.target.value})}>
          <option value="pc">PC</option><option value="server">サーバー</option><option value="nas">NAS</option><option value="network">ネットワーク機器</option><option value="iot">IoT</option><option value="vm">仮想マシン</option><option value="container">Dockerコンテナ</option>
        </select>
        <select value={form.icon} onChange={e => setForm({...form, icon: e.target.value})}>
          {DEVICE_ICONS.map(i => <option key={i.value} value={i.value}>{i.mark} {i.label}</option>)}
        </select>
        <input placeholder="メーカー" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
        <input placeholder="型番" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
        <input placeholder="OS" value={form.os_name} onChange={e => setForm({...form, os_name: e.target.value})} />
        <textarea placeholder="説明" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div><button onClick={submit}>{editingId ? '保存' : '機器を追加'}</button>{editingId && <button className="secondary-button" onClick={reset}>キャンセル</button>}</div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>アイコン</th><th>名前</th><th>種別</th><th>メーカー</th><th>OS</th><th>操作</th></tr></thead>
          <tbody>
            {devices.map(d => { const icon = getDeviceIcon(d.icon); return <tr key={d.id}><td>{d.id}</td><td className="icon-cell">{icon.mark}</td><td><Link className="text-link" to={`/devices/${d.id}`}>{d.name}</Link></td><td>{d.device_type}</td><td>{d.vendor}</td><td>{d.os_name}</td><td><Link className="small-button" to={`/devices/${d.id}`}>詳細</Link><button className="small-button" onClick={() => edit(d)}>編集</button><button className="danger-button" onClick={() => remove(d.id)}>削除</button></td></tr> })}
          </tbody>
        </table>
      </div>
    </>
  );
}
