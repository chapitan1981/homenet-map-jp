import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';
import { formatJst } from '../utils/dateTime';

type DockerContainer = { id:string; name:string; image:string; state:string; status:string; ports:any[] };

type Monitor = {
  id:number;
  device_id:number;
  monitor_type:string;
  target:string;
  name:string;
  enabled:boolean;
  status:string;
  response_ms:number;
  last_checked_at:string|null;
  last_error:string;
  note:string;
};

const emptyForm = {
  device_id:'',
  monitor_type:'ping',
  target:'',
  name:'',
  enabled:true,
  note:''
};

const normalizeStatus = (status?: string | null, responseMs?: number) => {
  const s = (status || 'unknown').toLowerCase();
  if (s === 'online' || s === 'ok' || s === 'success') return 'online';
  if (s === 'offline' || s === 'down') return 'offline';
  if (s === 'error' || s === 'failed') return 'error';
  if (s === 'disabled') return 'disabled';
  if ((responseMs || 0) > 0 && (s === 'unknown' || s === '')) return 'online';
  return 'unknown';
};

const statusLabel = (status?: string | null, responseMs?: number) => {
  const s = normalizeStatus(status, responseMs);
  if(s === 'online') return 'オンライン';
  if(s === 'offline') return 'オフライン';
  if(s === 'error') return 'エラー';
  if(s === 'disabled') return '無効';
  return '未確認';
};

const statusClass = (status?: string | null, responseMs?: number) => normalizeStatus(status, responseMs);


function monitorTimeV182(row: any): string {
  return formatJst(
    row?.last_checked_at ||
    row?.last_checked ||
    row?.last_check ||
    row?.checked_at ||
    row?.checkedAt ||
    row?.lastChecked ||
    row?.lastCheckedAt ||
    row?.updated_at ||
    row?.timestamp ||
    ''
  );
}


function monitorLastCheckCellV183(row: any): string {
  return monitoringLastCheckJst(row);
}

export default function MonitoringPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [monitors,setMonitors]=useState<Monitor[]>([]);
  const [form,setForm]=useState<any>(emptyForm);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [message,setMessage]=useState('');
  const [checking,setChecking]=useState(false);
  const [autoRefresh,setAutoRefresh]=useState('0');
  const [dockerContainers,setDockerContainers]=useState<DockerContainer[]>([]);
  const [dockerMessage,setDockerMessage]=useState('');

  const load=async()=>{
    const [d,m]=await Promise.all([api.get('/devices'), api.get('/monitors')]);
    setDevices(d.data);
    setMonitors(m.data);
  };

  const loadDocker=async()=>{
    setDockerMessage('');
    try{
      const res = await api.get('/docker/containers');
      setDockerContainers(res.data);
    }catch(err:any){
      setDockerMessage(`Docker取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  useEffect(()=>{load(); loadDocker();},[]);

  useEffect(()=>{
    const sec = Number(autoRefresh);
    if(!sec) return;
    const timer = window.setInterval(async()=>{
      try{
        await api.post('/monitors/check-all');
        await load();
      }catch{}
    }, sec * 1000);
    return ()=>window.clearInterval(timer);
  },[autoRefresh]);

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
    setForm({
      device_id:String(m.device_id),
      monitor_type:m.monitor_type,
      target:m.target,
      name:m.name||'',
      enabled:m.enabled,
      note:m.note||''
    });
  };

  const deleteMonitor=async(id:number)=>{
    if(!confirm('この監視設定を削除しますか？')) return;
    await api.delete(`/monitors/${id}`);
    await load();
  };

  const checkOne=async(id:number)=>{
    setMessage('');
    try{
      await api.post(`/monitors/${id}/check`);
      await load();
      setMessage('監視を実行しました。');
    }catch(err:any){
      setMessage(`監視実行失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
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
      online: monitors.filter(m=>statusClass(m.status,m.response_ms)==='online').length,
      offline: monitors.filter(m=>statusClass(m.status,m.response_ms)==='offline').length,
      error: monitors.filter(m=>statusClass(m.status,m.response_ms)==='error').length,
      unknown: monitors.filter(m=>statusClass(m.status,m.response_ms)==='unknown').length,
    };
  },[monitors]);

  const healthRate = monitors.length ? Math.round((summary.online / monitors.length) * 100) : 0;

  return <>
    <div className="page-title-row">
      <h2>監視</h2>
      <div className="page-actions">
        <select value={autoRefresh} onChange={e=>setAutoRefresh(e.target.value)}>
          <option value="0">自動更新なし</option>
          <option value="30">30秒ごと</option>
          <option value="60">1分ごと</option>
          <option value="300">5分ごと</option>
        </select>
        <button onClick={checkAll} disabled={checking}>{checking?'監視中...':'全監視を実行'}</button>
      </div>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('入力')?'status-message error':'status-message'}>{message}</div>}

    <div className="dashboard-stat-grid">
      <div className="dashboard-stat-card monitor-online-card"><span>オンライン</span><strong>{summary.online}</strong></div>
      <div className="dashboard-stat-card monitor-offline-card"><span>オフライン</span><strong>{summary.offline}</strong></div>
      <div className="dashboard-stat-card monitor-error-card"><span>エラー</span><strong>{summary.error}</strong></div>
      <div className="dashboard-stat-card"><span>未確認</span><strong>{summary.unknown}</strong></div>
      <div className="dashboard-stat-card"><span>正常率</span><strong>{healthRate}%</strong></div>
    </div>

    <div className="card">
      <h3>{editingId?'監視設定を編集':'監視設定を追加'}</h3>
      <p className="photo-hint">PingはIP、HTTPはURL、TCPは host:port、Dockerはコンテナ名を指定します。</p>
      <div className="connection-form-grid">
        <select value={form.device_id} onChange={e=>setForm({...form,device_id:e.target.value})} disabled={!!editingId}>
          <option value="">機器を選択</option>
          {devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={form.monitor_type} onChange={e=>setForm({...form,monitor_type:e.target.value})}>
          <option value="ping">Ping</option>
          <option value="http">HTTP</option>
          <option value="tcp">TCP Port</option>
          <option value="docker">Docker Container</option>
        </select>
        <input placeholder={form.monitor_type==='http'?'http://192.168.0.88:3030':form.monitor_type==='tcp'?'192.168.0.88:22':form.monitor_type==='docker'?'homenet-map-jp-backend':'192.168.0.88'} value={form.target} onChange={e=>setForm({...form,target:e.target.value})}/>
        <input placeholder="表示名 例: LAN Ping / WebUI / SSH" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input placeholder="メモ" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        <label className="inline-check"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/> 有効</label>
      </div>
      <div className="inline-form">
        <button onClick={saveMonitor}>{editingId?'保存':'追加'}</button>
        {editingId&&<button className="secondary-button" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>キャンセル</button>}
      </div>
    </div>


    <div className="card">
      <div className="page-title-row">
        <h3>Dockerコンテナ一覧</h3>
        <button className="small-button" onClick={loadDocker}>Docker再取得</button>
      </div>
      {dockerMessage&&<div className="status-message error">{dockerMessage}</div>}
      <p className="photo-hint">Docker監視では「コンテナ名」を監視先に入力します。</p>
      <div className="docker-container-grid">
        {dockerContainers.map(c=><button className="docker-container-card" key={c.id} onClick={()=>setForm({...form,monitor_type:'docker',target:c.name,name:c.name})}>
          <strong>🐳 {c.name}</strong>
          <span className={c.state==='running'?'docker-running':'docker-stopped'}>{c.state}</span>
          <small>{c.image}</small>
          <small>{c.status}</small>
        </button>)}
        {dockerContainers.length===0&&<p className="photo-hint">Dockerコンテナ未取得です。Docker再取得を押してください。</p>}
      </div>
    </div>

    <div className="card">
      <h3>監視一覧</h3>
      <table className="table monitor-table">
        <thead>
          <tr>
            <th>状態</th>
            <th>機器</th>
            <th>監視名</th>
            <th>種別</th>
            <th>監視先</th>
            <th>応答</th>
            <th>最終確認</th>
            <th>最終エラー</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {monitors.map(m=>{
            const cls = statusClass(m.status,m.response_ms);
            return <tr key={m.id} className={`monitor-row ${cls}`}>
              <td><span className={`monitor-status ${cls}`}>{statusLabel(m.status,m.response_ms)}</span></td>
              <td>{deviceIcon(m.device_id)} {deviceName(m.device_id)}</td>
              <td>{m.name || '-'}</td>
              <td>{m.monitor_type}</td>
              <td>{m.monitor_type==='http'?<a className="text-link" href={m.target} target="_blank" rel="noreferrer">{m.target}</a>:m.target}</td>
              <td>{m.response_ms ? `${m.response_ms} ms` : '-'}</td>
              <td>{formatJst(m.last_checked_at)}</td>
              <td>{m.last_error ? <small className={cls==='online'?'hint-text':'error-text'}>{m.last_error}</small> : '-'}</td>
              <td>
                <button className="small-button" onClick={()=>checkOne(m.id)}>確認</button>
                <button className="small-button" onClick={()=>editMonitor(m)}>編集</button>
                <button className="danger-button" onClick={()=>deleteMonitor(m.id)}>削除</button>
              </td>
            </tr>
          })}
          {monitors.length===0&&<tr><td colSpan={9}>監視設定未登録</td></tr>}
        </tbody>
      </table>
    </div>
  </>;
}
