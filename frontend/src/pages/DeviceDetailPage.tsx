import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import IconPicker from '../components/IconPicker';
import { deviceIcon } from '../utils/deviceIcon';

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
};

export default function DeviceDetailPage(){
  const { id } = useParams();
  const [device,setDevice]=useState<Device|null>(null);
  const [form,setForm]=useState<any|null>(null);
  const [message,setMessage]=useState('');

  const load=async()=>{
    setMessage('');
    try{
      const res=await api.get(`/devices/${id}`);
      setDevice(res.data);
      setForm({
        name:res.data.name || '',
        device_type:res.data.device_type || res.data.type || 'pc',
        vendor:res.data.vendor || '',
        model:res.data.model || '',
        os_name:res.data.os_name || '',
        description:res.data.description || '',
        icon:res.data.icon || '',
      });
    }catch(err:any){
      setMessage(`機器詳細取得失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  useEffect(()=>{load()},[id]);

  const save=async()=>{
    if(!form?.name?.trim()){
      setMessage('機器名を入力してください。');
      return;
    }
    try{
      const payload = {
        name: form.name,
        device_type: form.device_type,
        vendor: form.vendor || '',
        model: form.model || '',
        os_name: form.os_name || '',
        description: form.description || '',
        icon: form.icon || '',
      };
      await api.put(`/devices/${id}`, payload);
      setMessage('機器詳細を保存しました。');
      await load();
    }catch(err:any){
      setMessage(`保存失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  if(!device || !form){
    return <>
      <div className="page-title-row">
        <h2>機器詳細</h2>
        <Link className="small-button" to="/devices">機器管理へ戻る</Link>
      </div>
      {message ? <div className="status-message error">{message}</div> : <div className="card">読み込み中...</div>}
    </>;
  }

  return <>
    <div className="page-title-row">
      <h2>{deviceIcon(form.icon, form.device_type, form.name)} 機器詳細</h2>
      <div className="page-actions">
        <Link className="small-button" to="/devices">機器管理へ戻る</Link>
        <button onClick={load}>再取得</button>
      </div>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('入力')?'status-message error':'status-message'}>{message}</div>}

    <div className="card">
      <h3>{deviceIcon(form.icon, form.device_type, form.name)} {form.name}</h3>
      <p className="photo-hint">ここで選んだアイコンは、機器管理・構成図にも反映されます。</p>

      <div className="device-form-grid">
        <input placeholder="機器名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <select value={form.device_type} onChange={e=>setForm({...form,device_type:e.target.value})}>
          <option value="server">server</option>
          <option value="pc">pc</option>
          <option value="network">network</option>
          <option value="nas">nas</option>
          <option value="vm">vm</option>
          <option value="storage">storage</option>
          <option value="other">other</option>
        </select>
        <IconPicker value={form.icon} onChange={(icon)=>setForm({...form, icon})}/>
        <input placeholder="メーカー" value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}/>
        <input placeholder="モデル" value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/>
        <input placeholder="OS" value={form.os_name} onChange={e=>setForm({...form,os_name:e.target.value})}/>
      </div>

      <textarea placeholder="説明" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>

      <div className="device-save-bar">
        <button className="primary-save-button" onClick={save}>保存</button>
      </div>
    </div>
  </>;
}
