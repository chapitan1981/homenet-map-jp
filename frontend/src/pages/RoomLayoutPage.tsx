import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';
import { Device } from '../types/device';
import { getDeviceIcon } from '../types/icon';

type RoomPhoto = { id:number; room_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type Placement = { id:number; room_id:number; device_id:number; x_percent:number; y_percent:number; label:string; note:string };

export default function RoomLayoutPage() {
  const [rooms,setRooms]=useState<Room[]>([]);
  const [devices,setDevices]=useState<Device[]>([]);
  const [roomId,setRoomId]=useState('');
  const [photos,setPhotos]=useState<RoomPhoto[]>([]);
  const [backgroundPhotoId,setBackgroundPhotoId]=useState('');
  const [placements,setPlacements]=useState<Placement[]>([]);
  const [deviceId,setDeviceId]=useState('');
  const [x,setX]=useState(50);
  const [y,setY]=useState(50);
  const [label,setLabel]=useState('');
  const [message,setMessage]=useState('');

  const loadBase=async()=>{ const [r,d]=await Promise.all([api.get('/rooms'),api.get('/devices')]); setRooms(r.data); setDevices(d.data); };
  const loadRoom=async(id:string)=>{
    if(!id) return;
    const [ph,pl]=await Promise.all([api.get(`/rooms/${id}/photos`), api.get('/placements',{params:{room_id:id}})]);
    setPhotos(ph.data); setPlacements(pl.data);
    if(ph.data.length && !backgroundPhotoId) setBackgroundPhotoId(String(ph.data[0].id));
  };
  useEffect(()=>{loadBase()},[]);
  useEffect(()=>{loadRoom(roomId)},[roomId]);

  const selectedPhoto = useMemo(()=>photos.find(p=>String(p.id)===backgroundPhotoId) || photos[0], [photos,backgroundPhotoId]);
  const deviceName=(id:number)=>devices.find(d=>d.id===id)?.name || `Device ${id}`;
  const deviceById=(id:number)=>devices.find(d=>d.id===id);

  const addPlacement=async()=>{
    setMessage('');
    if(!roomId || !deviceId){ setMessage('部屋と機器を選択してください。'); return; }
    try{
      await api.post('/placements',{room_id:Number(roomId),device_id:Number(deviceId),x_percent:x,y_percent:y,label,note:''});
      setDeviceId(''); setLabel(''); await loadRoom(roomId); setMessage('機器を部屋レイアウトへ配置しました。');
    }catch(err:any){ setMessage(`配置失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`); }
  };

  const updatePlacement=async(p:Placement,nx:number,ny:number)=>{
    await api.put(`/placements/${p.id}`,{...p,x_percent:Math.max(0,Math.min(100,nx)),y_percent:Math.max(0,Math.min(100,ny))});
    await loadRoom(roomId);
  };
  const deletePlacement=async(id:number)=>{ if(!confirm('この配置を削除しますか？')) return; await api.delete(`/placements/${id}`); await loadRoom(roomId); };

  return <>
    <div className="page-title-row"><h2>部屋レイアウト</h2><button onClick={()=>loadRoom(roomId)}>再読み込み</button></div>
    <div className="card"><h3>部屋と背景写真</h3><div className="inline-form"><select value={roomId} onChange={e=>{setRoomId(e.target.value);setBackgroundPhotoId('');}}><option value="">部屋を選択</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><select value={backgroundPhotoId} onChange={e=>setBackgroundPhotoId(e.target.value)} disabled={!photos.length}><option value="">背景写真を選択</option>{photos.map(p=><option key={p.id} value={p.id}>{p.file_name}</option>)}</select></div><p className="photo-hint">部屋管理で写真を登録すると背景として選択できます。</p></div>
    <div className="card"><h3>機器を配置</h3><div className="inline-form"><select value={deviceId} onChange={e=>setDeviceId(e.target.value)}><option value="">機器を選択</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input type="number" min="0" max="100" value={x} onChange={e=>setX(Number(e.target.value))} placeholder="X%" /><input type="number" min="0" max="100" value={y} onChange={e=>setY(Number(e.target.value))} placeholder="Y%" /><input placeholder="表示名 任意" value={label} onChange={e=>setLabel(e.target.value)} /><button onClick={addPlacement}>配置追加</button></div>{message&&<div className={message.includes('失敗')||message.includes('選択')?'status-message error':'status-message'}>{message}</div>}</div>
    <div className="card"><h3>レイアウトプレビュー</h3>{!roomId&&<p className="photo-hint">部屋を選択してください。</p>}{roomId&&!selectedPhoto&&<p className="photo-hint">背景写真がありません。部屋管理で写真を追加してください。</p>}{roomId&&selectedPhoto&&<div className="room-layout-canvas"><img className="room-layout-bg" src={selectedPhoto.file_path}/>{placements.map(p=>{const d=deviceById(p.device_id);const icon=d?getDeviceIcon(d.icon).mark:'❔';return <div className="room-device-pin" key={p.id} style={{left:`${p.x_percent}%`,top:`${p.y_percent}%`}}><div className="pin-icon">{icon}</div><div className="pin-label">{p.label||deviceName(p.device_id)}</div></div>})}</div>}</div>
    <div className="card"><h3>配置一覧</h3><table className="table"><thead><tr><th>機器</th><th>X%</th><th>Y%</th><th>表示名</th><th>微調整</th><th>操作</th></tr></thead><tbody>{placements.map(p=><tr key={p.id}><td>{deviceName(p.device_id)}</td><td>{p.x_percent}</td><td>{p.y_percent}</td><td>{p.label}</td><td><button className="small-button" onClick={()=>updatePlacement(p,p.x_percent-5,p.y_percent)}>←</button><button className="small-button" onClick={()=>updatePlacement(p,p.x_percent+5,p.y_percent)}>→</button><button className="small-button" onClick={()=>updatePlacement(p,p.x_percent,p.y_percent-5)}>↑</button><button className="small-button" onClick={()=>updatePlacement(p,p.x_percent,p.y_percent+5)}>↓</button></td><td><button className="danger-button" onClick={()=>deletePlacement(p.id)}>削除</button></td></tr>)}{placements.length===0&&<tr><td colSpan={6}>配置未登録</td></tr>}</tbody></table></div>
  </>;
}
