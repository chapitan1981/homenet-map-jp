import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';

type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type Edge = { id:number; source_device_id:number; target_device_id:number; label:string; connection_type:string };

const EDGE_STORAGE_KEY = 'homenet-map-jp-manual-edges-v039';

export default function DiagramPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [photoMap,setPhotoMap]=useState<Record<number, DevicePhoto | null>>({});
  const [edges,setEdges]=useState<Edge[]>([]);
  const [sourceId,setSourceId]=useState('');
  const [targetId,setTargetId]=useState('');
  const [label,setLabel]=useState('');
  const [connectionType,setConnectionType]=useState('LAN');
  const [message,setMessage]=useState('');

  const load=async()=>{
    const res = await api.get('/devices');
    setDevices(res.data);
    const entries = await Promise.all(res.data.map(async (d:Device)=>{
      try{
        const ph = await api.get(`/devices/${d.id}/photos`);
        return [d.id, ph.data?.[0] || null] as const;
      }catch{
        return [d.id, null] as const;
      }
    }));
    setPhotoMap(Object.fromEntries(entries));

    try{
      const saved = localStorage.getItem(EDGE_STORAGE_KEY);
      if(saved) setEdges(JSON.parse(saved));
    }catch{
      setEdges([]);
    }
  };

  useEffect(()=>{load()},[]);

  useEffect(()=>{
    localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(edges));
  },[edges]);

  const deviceName=(id:number)=>devices.find(d=>d.id===id)?.name || `Device ${id}`;
  const deviceById=(id:number)=>devices.find(d=>d.id===id);

  const addEdge=()=>{
    setMessage('');
    const s = Number(sourceId);
    const t = Number(targetId);
    if(!s || !t || s===t){
      setMessage('接続元と接続先を正しく選択してください。');
      return;
    }
    const item:Edge = { id: Date.now(), source_device_id:s, target_device_id:t, label, connection_type:connectionType };
    setEdges([...edges,item]);
    setSourceId('');
    setTargetId('');
    setLabel('');
    setConnectionType('LAN');
    setMessage('接続線を追加しました。');
  };

  const deleteEdge=(id:number)=>{
    setEdges(edges.filter(e=>e.id!==id));
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
        <h3>手動接続線を追加</h3>
        <p className="photo-hint">Ver0.3.9では、まず手動で機器同士の接続を登録します。登録した接続はこのブラウザ内に保存されます。</p>
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
          <button onClick={addEdge}>接続追加</button>
        </div>
        {message&&<div className={message.includes('正しく')?'status-message error':'status-message'}>{message}</div>}
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
