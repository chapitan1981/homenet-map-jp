import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { DEVICE_ICON_OPTIONS, deviceIcon } from '../utils/deviceIcon';

type Device = {
  id:number;
  name:string;
  device_type?:string;
  type?:string;
  vendor?:string;
  model?:string;
  os_name?:string;
  description?:string;
  icon?:string;
  room_id?:number|null;
  location_id?:number|null;
  room_name?:string;
};

type Room = { id:number; name:string };

export default function DevicesPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [message,setMessage]=useState('');
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editingOriginal,setEditingOriginal]=useState<Device|null>(null);
  const [form,setForm]=useState<any>({
    name:'',
    device_type:'pc',
    vendor:'',
    model:'',
    os_name:'',
    description:'',
    icon:'pc',
    room_id:''
  });

  const load=async()=>{
    setMessage('');
    try{
      const [d,r]=await Promise.all([
        api.get('/devices/with-rooms').catch(()=>api.get('/devices')),
        api.get('/rooms').catch(()=>({data:[]}))
      ]);
      setDevices(d.data || []);
      setRooms(r.data || []);
    }catch(err:any){
      setMessage(`機器データ取得失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  useEffect(()=>{load()},[]);

  const roomName=(d:Device)=>{
    if(d.room_name) return d.room_name;
    const id = d.room_id || d.location_id;
    if(!id) return '未設定';
    return rooms.find(r=>r.id===Number(id))?.name || '未設定';
  };

  const deviceTypes = useMemo(()=>Array.from(new Set(devices.map(d=>d.device_type || d.type || 'unknown'))).sort(),[devices]);

  const reset=()=>{
    setEditingId(null);
    setEditingOriginal(null);
    setForm({name:'',device_type:'pc',vendor:'',model:'',os_name:'',description:'',icon:'pc',room_id:''});
  };

  const edit=(d:Device)=>{
    setEditingId(d.id);
    setEditingOriginal(d);
    setForm({
      name:d.name || '',
      device_type:d.device_type || d.type || 'pc',
      vendor:d.vendor || '',
      model:d.model || '',
      os_name:d.os_name || '',
      description:d.description || '',
      icon:d.icon || d.device_type || d.type || 'pc',
      room_id:d.room_id || d.location_id || ''
    });
  };

  const save=async()=>{
    setMessage('');
    if(!form.name.trim()){
      setMessage('機器名を入力してください。');
      return;
    }

    const selectedRoom = form.room_id ? Number(form.room_id) : null;
    const payload = {
      name: form.name,
      device_type: form.device_type,
      vendor: form.vendor || '',
      model: form.model || '',
      os_name: form.os_name || '',
      description: form.description || '',
      icon: form.icon || form.device_type || 'pc',
    };

    try{
      if(editingId){
        await api.put(`/devices/${editingId}`, payload);
        await api.patch(`/devices/${editingId}/room`, {room_id:selectedRoom});
        setMessage('機器を保存しました。');
      }else{
        const res = await api.post('/devices', payload);
        const savedId = res.data?.id;
        if(savedId){
          await api.patch(`/devices/${savedId}/room`, {room_id:selectedRoom});
        }
        setMessage('機器を追加しました。');
      }
      reset();
      await load();
    }catch(err:any){
      setMessage(`保存失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  const remove=async(id:number)=>{
    if(!confirm('この機器を削除しますか？')) return;
    try{
      await api.delete(`/devices/${id}`);
      await load();
    }catch(err:any){
      setMessage(`削除失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  return <>
    <div className="page-title-row">
      <h2>機器管理</h2>
      <div className="page-actions">
        <Link className="small-button" to="/rooms">部屋管理</Link>
        <Link className="small-button" to="/diagram">構成図</Link>
        <button onClick={load}>再取得</button>
      </div>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('入力')?'status-message error':'status-message'}>{message}</div>}

    <div className="card">
      <h3>{editingId?'機器を編集':'機器を追加'}</h3>
      <p className="photo-hint">保管部屋/設置部屋を設定すると、構成図の部屋別表示でグループ化できます。</p>
      <div className="device-form-grid">
        <input placeholder="機器名 例: 5950Proxmox" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <select value={form.device_type} onChange={e=>setForm({...form,device_type:e.target.value})}>
          <option value="server">server</option>
          <option value="pc">pc</option>
          <option value="network">network</option>
          <option value="nas">nas</option>
          <option value="vm">vm</option>
          <option value="storage">storage</option>
          <option value="other">other</option>
          {deviceTypes.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={form.room_id} onChange={e=>setForm({...form,room_id:e.target.value})}>
          <option value="">保管部屋/設置部屋：未設定</option>
          {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})}>
          <option value="">アイコンを選択：自動</option>
          {DEVICE_ICON_OPTIONS.map(opt=><option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>)}
        </select>
        <input placeholder="メーカー" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/>
        <input placeholder="モデル" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/>
        <input placeholder="OS" value={form.os_name} onChange={e=>setForm({...form,os_name:e.target.value})}/>
      </div>
      <textarea placeholder="説明" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>

      <div className="device-save-bar">
        <button className="primary-save-button" onClick={save}>保存</button>
        {editingId&&<button className="secondary-button" onClick={reset}>キャンセル</button>}
      </div>
    </div>

    <div className="card">
      <h3>機器一覧</h3>
      <table className="table">
        <thead>
          <tr><th>機器</th><th>種別</th><th>保管部屋/設置部屋</th><th>メーカー/モデル</th><th>操作</th></tr>
        </thead>
        <tbody>
          {devices.map(d=><tr key={d.id}>
            <td><Link className="text-link" to={`/devices/${d.id}`}>{deviceIcon(d.icon, d.device_type || d.type, d.name)} {d.name}</Link></td>
            <td>{d.device_type || d.type || '-'}</td>
            <td>{roomName(d)}</td>
            <td>{[d.vendor,d.model].filter(Boolean).join(' / ') || '-'}</td>
            <td>
              <button className="small-button" onClick={()=>edit(d)}>編集</button>
              <button className="danger-button" onClick={()=>remove(d.id)}>削除</button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
