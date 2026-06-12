import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type Device = {
  id:number;
  name:string;
  device_type?:string;
  type?:string;
  icon?:string;
  room_id?:number|null;
  location_id?:number|null;
  room_name?:string;
  vendor?:string;
  model?:string;
};

type Room = { id:number; name:string };

type Connection = {
  id:number;
  source_device_id?:number;
  target_device_id?:number;
  from_device_id?:number;
  to_device_id?:number;
  label?:string;
  connection_type?:string;
};

function iconOf(d:Device){
  const key = `${d.icon || ''} ${d.device_type || d.type || ''} ${d.name || ''}`.toLowerCase();
  if(key.includes('10g')) return '⚡';
  if(key.includes('router')) return '📡';
  if(key.includes('hub') || key.includes('switch') || key.includes('network')) return '🔀';
  if(key.includes('nas') || key.includes('truenas')) return '🗄️';
  if(key.includes('vm')) return '🧩';
  if(key.includes('laptop') || key.includes('note')) return '💻';
  if(key.includes('pc') || key.includes('server') || key.includes('proxmox')) return '🖥️';
  return '🖥️';
}

export default function DiagramPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [mode,setMode]=useState('all');
  const [roomId,setRoomId]=useState('');
  const [deviceType,setDeviceType]=useState('');
  const [quick,setQuick]=useState('');
  const [keyword,setKeyword]=useState('');
  const [message,setMessage]=useState('');

  const load=async()=>{
    setMessage('');
    try{
      const [d,r,c]=await Promise.all([
        api.get('/devices/with-rooms').catch(()=>api.get('/devices')),
        api.get('/rooms').catch(()=>({data:[]})),
        api.get('/connections').catch(()=>({data:[]})),
      ]);
      setDevices(d.data || []);
      setRooms(r.data || []);
      setConnections(c.data || []);
    }catch(err:any){
      setMessage(`構成図データ取得失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  useEffect(()=>{load()},[]);

  const deviceTypes = useMemo(()=>Array.from(new Set(devices.map(d=>d.device_type || d.type || 'unknown'))).sort(),[devices]);

  const roomName=(d:Device)=>{
    if(d.room_name) return d.room_name;
    const id = d.room_id || d.location_id;
    if(!id) return '未設定';
    return rooms.find(r=>r.id===Number(id))?.name || '未設定';
  };

  const filteredDevices = useMemo(()=>{
    let list = devices;

    if(mode === 'room' && roomId){
      const id = Number(roomId);
      list = list.filter(d=>(d.room_id || d.location_id) === id);
    }

    if(mode === 'type' && deviceType){
      list = list.filter(d=>(d.device_type || d.type || 'unknown') === deviceType);
    }

    if(quick){
      const q = quick.toLowerCase();
      list = list.filter(d=>{
        const text = `${d.name} ${d.device_type || d.type || ''} ${d.icon || ''} ${d.vendor || ''} ${d.model || ''}`.toLowerCase();
        if(q === 'network') return ['router','hub','switch','network','wifi','ap','10g'].some(k=>text.includes(k));
        if(q === 'nas') return ['nas','truenas','storage','hdd','ssd'].some(k=>text.includes(k));
        if(q === 'proxmox') return text.includes('proxmox') || text.includes('vm') || text.includes('server');
        if(q === 'pc') return ['pc','desktop','laptop','windows','ryzen'].some(k=>text.includes(k));
        if(q === 'docker') return ['docker','container','ubuntu'].some(k=>text.includes(k));
        return true;
      });
    }

    if(keyword.trim()){
      const k = keyword.trim().toLowerCase();
      list = list.filter(d=>`${d.name} ${d.device_type || d.type || ''} ${d.vendor || ''} ${d.model || ''} ${roomName(d)}`.toLowerCase().includes(k));
    }

    return list;
  },[devices,mode,roomId,deviceType,quick,keyword,rooms]);

  const filteredIds = useMemo(()=>new Set(filteredDevices.map(d=>d.id)),[filteredDevices]);

  const filteredConnections = useMemo(()=>{
    return connections.filter(c=>{
      const s = c.source_device_id ?? c.from_device_id;
      const t = c.target_device_id ?? c.to_device_id;
      if(!s || !t) return false;
      return filteredIds.has(s) && filteredIds.has(t);
    });
  },[connections,filteredIds]);

  const grouped = useMemo(()=>{
    const map:Record<string,Device[]> = {};
    filteredDevices.forEach(d=>{
      const key = mode === 'type'
        ? (d.device_type || d.type || 'unknown')
        : roomName(d);
      map[key] = map[key] || [];
      map[key].push(d);
    });
    return map;
  },[filteredDevices,mode,rooms]);

  const deviceName=(id:number|undefined)=>{
    if(!id) return '-';
    return devices.find(d=>d.id===id)?.name || `#${id}`;
  };

  const clearFilters=()=>{
    setMode('all');
    setRoomId('');
    setDeviceType('');
    setQuick('');
    setKeyword('');
  };

  return <>
    <div className="page-title-row">
      <h2>構成図</h2>
      <button onClick={load}>再取得</button>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    <div className="card">
      <h3>表示切替</h3>
      <p className="photo-hint">全体、部屋別、機器種別別、ネットワーク機器のみ、NASのみ、Proxmox/VM系のみ等に切り替えできます。</p>

      <div className="diagram-filter-row">
        <select value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="all">全体表示</option>
          <option value="room">部屋別表示</option>
          <option value="type">機器種別別表示</option>
        </select>

        {mode==='room'&&<select value={roomId} onChange={e=>setRoomId(e.target.value)}>
          <option value="">全部屋</option>
          {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
        </select>}

        {mode==='type'&&<select value={deviceType} onChange={e=>setDeviceType(e.target.value)}>
          <option value="">全種別</option>
          {deviceTypes.map(t=><option key={t} value={t}>{t}</option>)}
        </select>}

        <select value={quick} onChange={e=>setQuick(e.target.value)}>
          <option value="">クイックフィルタなし</option>
          <option value="network">ネットワーク機器のみ</option>
          <option value="nas">NAS/ストレージのみ</option>
          <option value="proxmox">Proxmox/VM/サーバー系</option>
          <option value="pc">PC系のみ</option>
          <option value="docker">Docker/Ubuntu系</option>
        </select>

        <input placeholder="キーワード検索" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
        <button className="secondary-button" onClick={clearFilters}>解除</button>
      </div>
    </div>

    <div className="card">
      <h3>構成図プレビュー</h3>
      <div className="diagram-summary">
        <div><span>表示機器</span><strong>{filteredDevices.length}</strong></div>
        <div><span>表示接続</span><strong>{filteredConnections.length}</strong></div>
        <div><span>全機器</span><strong>{devices.length}</strong></div>
      </div>

      <div className="diagram-room-grid">
        {Object.entries(grouped).map(([group, list])=><div className="diagram-room-card" key={group}>
          <h4>{mode==='type'?'🏷️':'🏠'} {group}</h4>
          <div className="diagram-node-grid">
            {list.map(d=><div className="diagram-node-card" key={d.id}>
              <strong>{iconOf(d)} {d.name}</strong>
              <small>{d.device_type || d.type || 'unknown'} / {roomName(d)}</small>
            </div>)}
          </div>
        </div>)}
      </div>
    </div>

    <div className="card">
      <h3>接続一覧</h3>
      <table className="table">
        <thead>
          <tr><th>接続元</th><th>接続先</th><th>種別</th><th>ラベル</th></tr>
        </thead>
        <tbody>
          {filteredConnections.map(c=>{
            const s = c.source_device_id ?? c.from_device_id;
            const t = c.target_device_id ?? c.to_device_id;
            return <tr key={c.id}>
              <td>{deviceName(s)}</td>
              <td>{deviceName(t)}</td>
              <td>{c.connection_type || '-'}</td>
              <td>{c.label || '-'}</td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </>;
}
