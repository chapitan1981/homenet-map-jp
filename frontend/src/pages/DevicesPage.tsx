import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';
import { DEVICE_ICONS, getDeviceIcon } from '../types/icon';
import { DEVICE_TEMPLATES } from '../types/templates';

type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };

const emptyForm = { name: '', device_type: 'pc', vendor: '', model: '', os_name: '', description: '', icon: '' };

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<number, DevicePhoto | null>>({});
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedTemplateId,setSelectedTemplateId]=useState('');

  const load = async () => {
    const params: any = {};
    if (keyword) params.keyword = keyword;
    if (typeFilter) params.device_type = typeFilter;
    const res = await api.get('/devices', { params });
    setDevices(res.data);

    const entries = await Promise.all(res.data.map(async (d: Device) => {
      try {
        const ph = await api.get(`/devices/${d.id}/photos`);
        return [d.id, ph.data?.[0] || null] as const;
      } catch {
        return [d.id, null] as const;
      }
    }));
    setPhotoMap(Object.fromEntries(entries));
  };

  useEffect(() => { load(); }, []);

  const onTemplateSelect=(id:string)=>{
    setSelectedTemplateId(id);
    const t = DEVICE_TEMPLATES.find(x=>x.id===id);
    if(t){
      setForm({...form, device_type:t.device_type, icon:t.icon});
    }
  };

  const submit = async () => {
    if (!form.name) return;
    const res = await api.post('/devices', form);
    setForm(emptyForm);
    await load();
    location.href = `/devices/${res.data.id}?edit=1`;
  };

  const remove = async (id: number) => {
    if (!confirm('この機器を削除しますか？')) return;
    await api.delete(`/devices/${id}`);
    await load();
  };

  return (
    <>
      <div className="page-title-row">
        <h2>機器管理</h2>
      </div>

      <div className="card">
        <h3>検索</h3>
        <div className="inline-form">
          <input placeholder="検索キーワード" value={keyword} onChange={e => setKeyword(e.target.value)} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">すべて</option><option value="pc">PC</option><option value="server">サーバー</option><option value="nas">NAS</option><option value="network">ネットワーク機器</option><option value="iot">IoT</option><option value="vm">仮想マシン</option><option value="container">Dockerコンテナ</option>
          </select>
          <button onClick={load}>検索</button>
          <button className="secondary-button" onClick={() => { setKeyword(''); setTypeFilter(''); setTimeout(load,0); }}>クリア</button>
        </div>
      </div>

      <div className="card form">
        <h3>新規機器を追加</h3>
        <p className="photo-hint">追加後、自動で個別機器の編集画面へ移動します。基本情報・写真・パーツ・ネットワーク情報は個別画面でまとめて編集できます。</p>
        <select value={selectedTemplateId} onChange={e=>onTemplateSelect(e.target.value)}>
          <option value="">新規作成テンプレート</option>
          {DEVICE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
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
        <button onClick={submit}>機器を追加して編集へ進む</button>
      </div>

      <div className="device-card-grid">
        {devices.map(d => {
          const icon = getDeviceIcon(d.icon);
          const photo = photoMap[d.id];
          return (
            <div className="device-summary-card" key={d.id}>
              <Link to={`/devices/${d.id}`} className="summary-photo-link">
                {photo ? <img src={photo.file_path} /> : <div className="summary-no-photo">{icon.mark}</div>}
              </Link>
              <div className="summary-body">
                <h3>{icon.mark} {d.name}</h3>
                <p>{d.device_type} / {d.vendor || '-'} / {d.os_name || '-'}</p>
                <div className="summary-actions">
                  <Link className="small-button" to={`/devices/${d.id}?edit=1`}>編集・写真追加</Link>
                  <button className="danger-button" onClick={() => remove(d.id)}>削除</button>
                </div>
              </div>
            </div>
          );
        })}
        {devices.length === 0 && <div className="card">機器未登録</div>}
      </div>
    </>
  );
}
