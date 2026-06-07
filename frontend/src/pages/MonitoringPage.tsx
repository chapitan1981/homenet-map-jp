import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';

type Monitor = {
  id:number; device_id:number; monitor_type:string; target:string; name:string; enabled:boolean;
  status:string; response_ms:number; last_checked_at:string|null; last_error:string; note:string;
};

const emptyForm = { device_id:'', monitor_type:'ping', target:'', name:'', enabled:true, note:'' };

export default function MonitoringPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [monitors,setMonitors]=useState<Monitor[]>([]);
  const [form,setForm]=useState<any>(emptyForm);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [checking,setChecking]=useState(false);

  const load=async()=>{
    const [d,m]=await Promise.all([api.get('/devices'), api.get('/monitors')]);
    setDevices(d.data);
    setMonitors(m.data);
  };

  useEffect(()=>{load()},[]);

  const deviceName=(id:number)=>devices.find(d=>d.id===id)?.name || `Device ${id}`;
  const deviceIcon=(id:number)=>{
    const d=devices.find(x=>x.id===id);
    return d ? getDeviceIcon(d.icon,d.device_type).mark : '❔';
  };

  const saveMonitor=async()=>{
    setMessage('');
    if(!form.device_id || !form.target.trim()){
      setMessage('機器と監視先を入力してください。');
      return;
    }
    const payload = {
      monitor_type:form.monitor_type,
      target:form.target,
      name:form.name,
      enabled:!!form.enabled,
      note:form.note
    };
    try{
      editingId ? await api.put(`/monitors/${editingId}`, payload) : await api.post(`/devices/${form.device_id}/monitors`, payload);
      setForm(emptyForm);
      setEditingId(null);
      await load();
      setMessage('監視設定を保存しました。');
    }catch(err:any){
      setMessage(`保存失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  const editMonitor=(m:Monitor)=>{
    setEditingId(m.id);
    setForm({device_id:String(m.device_id), monitor_type:m.monitor_type, target:m.target, name:m.name||'', enabled:m.enabled, note:m.note||''});
  };

  const deleteMonitor=async(id:number)=>{
    if(!confirm('この監視設定を削除しますか？')) return;
    await api.delete(`/monitors/${id}`);
    await load();
  };

  const checkOne=async(id:number)=>{
    await api.post(`/monitors/${id}/check`);
    await load();
  };

  const checkAll=async()=>{
    setChecking(true);
    setMessage('');
    try{
      const res = await api.post('/monitors/check-all');
      await load();
      setMessage(`${res.data.checked}件の監視を実行しました。`);
    }catch(err:any){
      setMessage(`監視実行失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setChecking(false);
    }
  };

  const summary = useMemo(()=>{
    return {
      online: monitors.filter(m=>m.status==='online').length,
      offline: monitors.filter(m=>m.status==='offline').length,
      error: monitors.filter(m=>m.status==='error').length,
      unknown: monitors.filter(m=>!m.status || m.status==='unknown').length,
    };
  },[monitors]);

  const statusLabel=(s:string)=>{
    if(s==='online') return 'オンライン';
    if(s==='offline') return 'オフライン';
    if(s==='error') return 'エラー';
    if(s==='disabled') return '無効';
    return '未確認';
  };

  return <>
    <div className="page-title-row">
      <h2>監視</h2>
      <button onClick={checkAll} disabled={checking}>{checking?'監視中...':'全監視を実行'}</button>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('入力')?'status-message error':'status-message'}>{message}</div>}

    <div className="dashboard-stat-grid">
      <div className="dashboard-stat-card"><span>オンライン</span><strong>{summary.online}</strong></div>
      <div className="dashboard-stat-card"><span>オフライン</span><strong>{summary.offline}</strong></div>
      <div className="dashboard-stat-card"><span>エラー</span><strong>{summary.error}</strong></div>
      <div className="dashboard-stat-card"><span>未確認</span><strong>{summary.unknown}</strong></div>
    </div>

    <div className="card">
      <h3>{editingId?'監視設定を編集':'監視設定を追加'}</h3>
      <p className="photo-hint">PingはLAN/Tailscale IP、HTTPはWebUI URL、TCPは host:port 形式で指定します。</p>
      <div className="connection-form-grid">
        <select value={form.device_id} onChange={e=>setForm({...form,device_id:e.target.value})} disabled={!!editingId}>
          <option value="">機器を選択</option>
          {devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={form.monitor_type} onChange={e=>setForm({...form,monitor_type:e.target.value})}>
          <option value="ping">Ping</option>
          <option value="http">HTTP</option><option value="tcp">TCP Port</option>
        </select>
        <input placeholder={form.monitor_type==='http'?'http://192.168.0.88:3030':form.monitor_type==='tcp'?'192.168.0.88:22':'192.168.0.88'} value={form.target} onChange={e=>setForm({...form,target:e.target.value})}/>
        <input placeholder="表示名 例: LAN Ping / WebUI" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input placeholder="メモ" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <label className="inline-check"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/> 有効</label>
      </div>
      <div className="inline-form">
        <button onClick={saveMonitor}>{editingId?'保存':'追加'}</button>
        {editingId&&<button className="secondary-button" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>キャンセル</button>}
      </div>
    </div>

    <div className="card">
      <h3>監視一覧</h3>
      <table className="table">
        <thead><tr><th>状態</th><th>機器</th><th>種別</th><th>監視先</th><th>応答</th><th>最終確認</th><th>操作</th></tr></thead>
        <tbody>
          {monitors.map(m=><tr key={m.id}>
            <td><span className={`monitor-status ${m.status||'unknown'}`}>{statusLabel(m.status)}</span></td>
            <td>{deviceIcon(m.device_id)} {deviceName(m.device_id)}<br/><small>{m.name}</small></td>
            <td>{m.monitor_type}</td>
            <td>{m.monitor_type==='http'?<a className="text-link" href={m.target} target="_blank" rel="noreferrer">{m.target}</a>:m.target}{m.last_error&&<><br/><small className="error-text">{m.last_error}</small></>}</td>
            <td>{m.response_ms ? `${m.response_ms} ms` : '-'}</td>
            <td>{m.last_checked_at ? new Date(m.last_checked_at).toLocaleString('ja-JP') : '-'}</td>
            <td><button className="small-button" onClick={()=>checkOne(m.id)}>確認</button><button className="small-button" onClick={()=>editMonitor(m)}>編集</button><button className="danger-button" onClick={()=>deleteMonitor(m.id)}>削除</button></td>
          </tr>)}
          {monitors.length===0&&<tr><td colSpan={7}>監視設定未登録</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
