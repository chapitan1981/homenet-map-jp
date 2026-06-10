import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

type Device = {
  id:number;
  name:string;
  device_type?:string;
  type?:string;
  room_id?:number|null;
  location_id?:number|null;
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

export default function DiagramPage(){
  const [devices,setDevices]=useState<Device[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [connections,setConnections]=useState<Connection[]>([]);
  const [mode,setMode]=useState('all');
  const [roomId,setRoomId]=useState('');
  const [deviceType,setDeviceType]=useState('');
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
      setMessage(`構成図データ取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  useEffect(()=>{load()},[]);

  const deviceTypes = useMemo(()=>Array.from(new Set(devices.map(d=>d.device_type || d.type || 'unknown'))).sort(),[devices]);

  const roomName=(id:any)=>{
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
    return list;
  },[devices,mode,roomId,deviceType]);

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
      const key = d.room_name || roomName(d.room_id || d.location_id);
      map[key] = map[key] || [];
      map[key].push(d);
    });
    return map;
  },[filteredDevices,rooms]);

  const deviceName=(id:number|undefined)=>{
    if(!id) return '-';
    return devices.find(d=>d.id===id)?.name || `#${id}`;
  };

  return <>
    <div className="page-title-row">
      <h2>構成図</h2>
      <button onClick={load}>再取得</button>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    <div className="card">
      <h3>表示切替</h3>
      <p className="photo-hint">全体、部屋別、機器種別別に構成図表示を切り替えます。機器管理で保管部屋/設置部屋を設定すると部屋ごとにグループ表示されます。</p>
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
          <option value="">機器種別を選択</option>
          {deviceTypes.map(t=><option key={t} value={t}>{t}</option>)}
        </select>}
      </div>
    </div>

    <div className="card">
      <h3>構成図プレビュー</h3>
      <div className="diagram-summary">
        <div><span>表示機器</span><strong>{filteredDevices.length}</strong></div>
        <div><span>表示接続</span><strong>{filteredConnections.length}</strong></div>
        <div><span>表示モード</span><strong>{mode==='all'?'全体':mode==='room'?'部屋別':'種別別'}</strong></div>
      </div>

      <div className="diagram-room-grid">
        {Object.entries(grouped).map(([room, list])=><div className="diagram-room-card" key={room}>
          <h4>🏠 {room}</h4>
          <div className="diagram-node-grid">
            {list.map(d=><div className="diagram-node-card" key={d.id}>
              <strong>🖥️ {d.name}</strong>
              <small>{d.device_type || d.type || 'unknown'}</small>
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
