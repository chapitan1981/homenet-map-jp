import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';

type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type Edge = { id:number; source_device_id:number; target_device_id:number; label:string; connection_type:string; source_port:string; target_port:string; speed:string; cable_type:string; note:string; sort_order:number };

const emptyEdgeForm = { source_device_id:'', target_device_id:'', connection_type:'LAN', source_port:'', target_port:'', speed:'', cable_type:'', label:'', note:'', sort_order:0 };

export default function DiagramPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [photoMap,setPhotoMap]=useState<Record<number, DevicePhoto | null>>({});
  const [edges,setEdges]=useState<Edge[]>([]);
  const [form,setForm]=useState<any>(emptyEdgeForm);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [message,setMessage]=useState('');

  const load=async()=>{
    const [devRes, edgeRes] = await Promise.all([api.get('/devices'), api.get('/connections')]);
    setDevices(devRes.data);
    setEdges(edgeRes.data);
    const entries = await Promise.all(devRes.data.map(async (d:Device)=>{
      try{ const ph = await api.get(`/devices/${d.id}/photos`); return [d.id, ph.data?.[0] || null] as const; }
      catch{ return [d.id, null] as const; }
    }));
    setPhotoMap(Object.fromEntries(entries));
  };

  useEffect(()=>{load()},[]);

  const deviceName=(id:number)=>devices.find(d=>d.id===id)?.name || `Device ${id}`;
  const deviceById=(id:number)=>devices.find(d=>d.id===id);

  const resetForm=()=>{ setForm(emptyEdgeForm); setEditingId(null); setMessage(''); };

  const saveEdge=async()=>{
    setMessage('');
    const s = Number(form.source_device_id);
    const t = Number(form.target_device_id);
    if(!s || !t || s===t){ setMessage('接続元と接続先を正しく選択してください。'); return; }
    const payload = {
      source_device_id:s, target_device_id:t, connection_type:form.connection_type || 'LAN',
      source_port:form.source_port || '', target_port:form.target_port || '', speed:form.speed || '',
      cable_type:form.cable_type || '', label:form.label || '', note:form.note || '', sort_order:Number(form.sort_order || 0)
    };
    try{
      editingId ? await api.put(`/connections/${editingId}`, payload) : await api.post('/connections', payload);
      setMessage(editingId ? '接続情報を更新しました。' : '接続情報をDBへ保存しました。');
      resetForm(); await load();
    }catch(err:any){ setMessage(`保存失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`); }
  };

  const editEdge=(e:Edge)=>{
    setEditingId(e.id);
    setForm({
      source_device_id:String(e.source_device_id), target_device_id:String(e.target_device_id),
      connection_type:e.connection_type || 'LAN', source_port:e.source_port || '', target_port:e.target_port || '',
      speed:e.speed || '', cable_type:e.cable_type || '', label:e.label || '', note:e.note || '', sort_order:e.sort_order || 0
    });
    setMessage('接続情報を編集しています。');
  };

  const deleteEdge=async(id:number)=>{ if(!confirm('この接続線を削除しますか？')) return; await api.delete(`/connections/${id}`); await load(); };

  const groupedDevices = useMemo(()=>{
    const groups:Record<string, Device[]> = {};
    devices.forEach(d=>{ const key = d.device_type || 'other'; groups[key] = groups[key] || []; groups[key].push(d); });
    return groups;
  },[devices]);

  const connectionSummary=(e:Edge)=>[e.connection_type,e.speed,e.cable_type,e.label].filter(Boolean).join(' / ') || '接続';

  return <>
    <div className="page-title-row"><h2>構成図・配線管理</h2><button onClick={load}>再読み込み</button></div>

    <div className="card">
      <h3>{editingId ? '接続情報を編集' : '接続情報を追加'}</h3>
      <p className="photo-hint">接続元・接続先・ポート・速度・ケーブル種別を登録できます。</p>
      <div className="connection-form-grid">
        <select value={form.source_device_id} onChange={e=>setForm({...form,source_device_id:e.target.value})}><option value="">接続元</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input placeholder="接続元ポート 例: eth0 / Port1" value={form.source_port} onChange={e=>setForm({...form,source_port:e.target.value})}/>
        <select value={form.target_device_id} onChange={e=>setForm({...form,target_device_id:e.target.value})}><option value="">接続先</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <input placeholder="接続先ポート 例: LAN1 / Port8" value={form.target_port} onChange={e=>setForm({...form,target_port:e.target.value})}/>
        <select value={form.connection_type} onChange={e=>setForm({...form,connection_type:e.target.value})}><option value="LAN">LAN</option><option value="10GbE">10GbE</option><option value="2.5GbE">2.5GbE</option><option value="Wi-Fi">Wi-Fi</option><option value="USB">USB</option><option value="HDMI">HDMI</option><option value="Tailscale">Tailscale</option><option value="Virtual">仮想接続</option><option value="Other">その他</option></select>
        <select value={form.speed} onChange={e=>setForm({...form,speed:e.target.value})}><option value="">速度</option><option value="100Mbps">100Mbps</option><option value="1Gbps">1Gbps</option><option value="2.5Gbps">2.5Gbps</option><option value="5Gbps">5Gbps</option><option value="10Gbps">10Gbps</option><option value="Virtual">仮想</option></select>
        <select value={form.cable_type} onChange={e=>setForm({...form,cable_type:e.target.value})}><option value="">ケーブル種別</option><option value="Cat5e">Cat5e</option><option value="Cat6">Cat6</option><option value="Cat6A">Cat6A</option><option value="DAC">DAC</option><option value="光ファイバー">光ファイバー</option><option value="USB">USB</option><option value="Wi-Fi">Wi-Fi</option><option value="仮想">仮想</option></select>
        <input placeholder="ラベル 例: trunk / backup / storage" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
        <textarea placeholder="メモ" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
      </div>
      <div className="inline-form"><button onClick={saveEdge}>{editingId ? '接続情報を保存' : '接続追加'}</button>{editingId&&<button className="secondary-button" onClick={resetForm}>キャンセル</button>}</div>
      {message&&<div className={message.includes('失敗')||message.includes('正しく')?'status-message error':'status-message'}>{message}</div>}
    </div>

    <div className="diagram-layout">
      <div className="card diagram-main"><h3>機器ノード</h3><div className="diagram-device-grid">{Object.entries(groupedDevices).map(([type,list])=><div className="diagram-group" key={type}><h4>{type}</h4>{list.map(d=>{const icon=getDeviceIcon(d.icon,d.device_type); const photo=photoMap[d.id]; return <div className="diagram-node" key={d.id}><div className="diagram-node-thumb">{photo?<img src={photo.file_path}/>:<span>{icon.mark}</span>}</div><div><strong>{d.name}</strong><p>{d.vendor||'-'} / {d.os_name||'-'}</p><a className="small-button" href={`/devices/${d.id}?edit=1`}>編集</a></div></div>})}</div>)}</div></div>
      <div className="card diagram-side"><h3>接続一覧</h3>{edges.length===0&&<p className="photo-hint">接続線未登録</p>}{edges.map(e=><div className="edge-card" key={e.id}><div><strong>{deviceName(e.source_device_id)}</strong> <span className="port-badge">{e.source_port||'-'}</span></div><div className="edge-arrow">↓ {connectionSummary(e)}</div><div><strong>{deviceName(e.target_device_id)}</strong> <span className="port-badge">{e.target_port||'-'}</span></div>{e.note&&<p className="photo-hint">{e.note}</p>}<div className="summary-actions"><button className="small-button" onClick={()=>editEdge(e)}>編集</button><button className="danger-button" onClick={()=>deleteEdge(e.id)}>削除</button></div></div>)}</div>
    </div>

    <div className="card"><h3>簡易構成図プレビュー</h3><div className="flow-preview">{edges.map(e=>{const source=deviceById(e.source_device_id); const target=deviceById(e.target_device_id); return <div className="flow-row" key={e.id}><div className="flow-node">{source?getDeviceIcon(source.icon,source.device_type).mark:'❔'} {deviceName(e.source_device_id)}<br/><span className="port-badge">{e.source_port||'-'}</span></div><div className="flow-line">─ {connectionSummary(e)} →</div><div className="flow-node">{target?getDeviceIcon(target.icon,target.device_type).mark:'❔'} {deviceName(e.target_device_id)}<br/><span className="port-badge">{e.target_port||'-'}</span></div></div>})}{edges.length===0&&<p className="photo-hint">接続を追加するとここにプレビューされます。</p>}</div></div>
  </>;
}
