import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';

type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type Edge = { id:number; source_device_id:number; target_device_id:number; label:string; connection_type:string; note:string; sort_order:number };

export default function DiagramPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [photoMap,setPhotoMap]=useState<Record<number, DevicePhoto | null>>({});
  const [edges,setEdges]=useState<Edge[]>([]);
  const [sourceId,setSourceId]=useState('');
  const [targetId,setTargetId]=useState('');
  const [label,setLabel]=useState('');
  const [connectionType,setConnectionType]=useState('LAN');
  const [note,setNote]=useState('');
  const [message,setMessage]=useState('');

  const load=async()=>{
    const [devRes, edgeRes] = await Promise.all([
      api.get('/devices'),
      api.get('/connections')
    ]);
    setDevices(devRes.data);
    setEdges(edgeRes.data);

    const entries = await Promise.all(devRes.data.map(async (d:Device)=>{
      try{
        const ph = await api.get(`/devices/${d.id}/photos`);
        return [d.id, ph.data?.[0] || null] as const;
      }catch{
        return [d.id, null] as const;
      }
    }));
    setPhotoMap(Object.fromEntries(entries));
  };

  useEffect(()=>{load()},[]);

  const deviceName=(id:number)=>devices.find(d=>d.id===id)?.name || `Device ${id}`;
  const deviceById=(id:number)=>devices.find(d=>d.id===id);

  const addEdge=async()=>{
    setMessage('');
    const s = Number(sourceId);
    const t = Number(targetId);
    if(!s || !t || s===t){
      setMessage('接続元と接続先を正しく選択してください。');
      return;
    }
    try{
      await api.post('/connections', {
        source_device_id:s,
        target_device_id:t,
        connection_type:connectionType,
        label,
        note,
        sort_order:0
      });
      setSourceId('');
      setTargetId('');
      setLabel('');
      setConnectionType('LAN');
      setNote('');
      await load();
      setMessage('接続線をDBへ保存しました。');
    }catch(err:any){
      setMessage(`接続追加失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  const deleteEdge=async(id:number)=>{
    if(!confirm('この接続線を削除しますか？')) return;
    await api.delete(`/connections/${id}`);
    await load();
  };

  const groupedDevices = useMemo(()=>{
    const groups:Record<string, Device[]> = {};
    devices.forEach(d=>{
      const key = d.device_type || 'other';
      groups[key] = groups[key] || [];
      groups[key].push(d);
    });
    return groups;
  },[devices]);

  return (
    <>
      <div className="page-title-row">
        <h2>構成図</h2>
        <button onClick={load}>再読み込み</button>
      </div>

      <div className="card">
        <h3>接続線を追加</h3>
        <p className="photo-hint">Ver0.4.1から、接続線はDB保存されます。別端末・別ブラウザでも同じ構成図を確認できます。</p>
        <div className="inline-form">
          <select value={sourceId} onChange={e=>setSourceId(e.target.value)}>
            <option value="">接続元</option>
            {devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={targetId} onChange={e=>setTargetId(e.target.value)}>
            <option value="">接続先</option>
            {devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={connectionType} onChange={e=>setConnectionType(e.target.value)}>
            <option value="LAN">LAN</option>
            <option value="10GbE">10GbE</option>
            <option value="Wi-Fi">Wi-Fi</option>
            <option value="USB">USB</option>
            <option value="HDMI">HDMI</option>
            <option value="Tailscale">Tailscale</option>
            <option value="Virtual">仮想接続</option>
            <option value="Other">その他</option>
          </select>
          <input placeholder="ラベル 例: 10GbE / trunk / tailscale" value={label} onChange={e=>setLabel(e.target.value)}/>
          <input placeholder="メモ" value={note} onChange={e=>setNote(e.target.value)}/>
          <button onClick={addEdge}>接続追加</button>
        </div>
        {message&&<div className={message.includes('失敗')||message.includes('正しく')?'status-message error':'status-message'}>{message}</div>}
      </div>

      <div className="diagram-layout">
        <div className="card diagram-main">
          <h3>機器ノード</h3>
          <div className="diagram-device-grid">
            {Object.entries(groupedDevices).map(([type,list])=>(
              <div className="diagram-group" key={type}>
                <h4>{type}</h4>
                {list.map(d=>{
                  const icon = getDeviceIcon(d.icon);
                  const photo = photoMap[d.id];
                  return <div className="diagram-node" key={d.id}>
                    <div className="diagram-node-thumb">{photo ? <img src={photo.file_path}/> : <span>{icon.mark}</span>}</div>
                    <div>
                      <strong>{d.name}</strong>
                      <p>{d.vendor || '-'} / {d.os_name || '-'}</p>
                      <a className="small-button" href={`/devices/${d.id}?edit=1`}>編集</a>
                    </div>
                  </div>
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="card diagram-side">
          <h3>接続一覧</h3>
          {edges.length===0 && <p className="photo-hint">接続線未登録</p>}
          {edges.map(e=>(
            <div className="edge-card" key={e.id}>
              <div><strong>{deviceName(e.source_device_id)}</strong></div>
              <div className="edge-arrow">↓ {e.connection_type} {e.label ? ` / ${e.label}` : ''}</div>
              <div><strong>{deviceName(e.target_device_id)}</strong></div>
              {e.note && <p className="photo-hint">{e.note}</p>}
              <button className="danger-button" onClick={()=>deleteEdge(e.id)}>削除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>簡易構成図プレビュー</h3>
        <div className="flow-preview">
          {edges.map(e=>{
            const source = deviceById(e.source_device_id);
            const target = deviceById(e.target_device_id);
            return <div className="flow-row" key={e.id}>
              <div className="flow-node">{source ? getDeviceIcon(source.icon).mark : '❔'} {deviceName(e.source_device_id)}</div>
              <div className="flow-line">─ {e.connection_type}{e.label ? ` / ${e.label}` : ''} →</div>
              <div className="flow-node">{target ? getDeviceIcon(target.icon).mark : '❔'} {deviceName(e.target_device_id)}</div>
            </div>
          })}
          {edges.length===0 && <p className="photo-hint">接続を追加するとここにプレビューされます。</p>}
        </div>
      </div>
    </>
  );
}
