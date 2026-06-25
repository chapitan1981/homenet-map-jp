import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { deviceIcon } from '../utils/deviceIcon';
import { Device } from '../types/device';
import { Room } from '../types/room';
import { getDeviceIcon } from '../types/icon';

type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type RoomPhoto = { id:number; room_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type Edge = { id:number; source_device_id:number; target_device_id:number; label:string; connection_type:string; source_port:string; target_port:string; speed:string; cable_type:string; note:string; sort_order:number };
type Placement = { id:number; room_id:number; device_id:number; x_percent:number; y_percent:number; label:string; note:string };
type DeviceUrl = { id:number; device_id:number; name:string; url:string; url_type:string; note:string; sort_order:number };
type DeviceMonitor = { id:number; device_id:number; status:string; };

export default function DashboardPage() {
  const [devices,setDevices]=useState<Device[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [devicePhotos,setDevicePhotos]=useState<DevicePhoto[]>([]);
  const [roomPhotos,setRoomPhotos]=useState<RoomPhoto[]>([]);
  const [edges,setEdges]=useState<Edge[]>([]);
  const [placements,setPlacements]=useState<Placement[]>([]);
  const [deviceUrls,setDeviceUrls]=useState<DeviceUrl[]>([]);
  const [monitors,setMonitors]=useState<DeviceMonitor[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const [d,r,e,p,u,mo]=await Promise.all([
        api.get('/devices'),
        api.get('/rooms'),
        api.get('/connections').catch(()=>({data:[]})),
        api.get('/placements').catch(()=>({data:[]})),
        api.get('/device-urls').catch(()=>({data:[]})),
        api.get('/monitors').catch(()=>({data:[]}))
      ]);

      setDevices(d.data);
      setRooms(r.data);
      setEdges(e.data);
      setPlacements(p.data);
      setDeviceUrls(u.data);
      setMonitors(mo.data);

      const dpArrays = await Promise.all(d.data.map(async (dev:Device)=>{
        try{ return (await api.get(`/devices/${dev.id}/photos`)).data; }catch{ return []; }
      }));
      setDevicePhotos(dpArrays.flat());

      const rpArrays = await Promise.all(r.data.map(async (room:Room)=>{
        try{ return (await api.get(`/rooms/${room.id}/photos`)).data; }catch{ return []; }
      }));
      setRoomPhotos(rpArrays.flat());
    }catch(err:any){
      setMessage(`ダッシュボード取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const deviceTypeCounts = useMemo(()=>{
    const map:Record<string, number> = {};
    devices.forEach(d=>{
      const key = d.device_type || 'other';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[devices]);

  const recentDevices = useMemo(()=>devices.slice(-6).reverse(),[devices]);
  const connectedDeviceIds = useMemo(()=>{
    const s = new Set<number>();
    edges.forEach(e=>{s.add(e.source_device_id);s.add(e.target_device_id);});
    return s;
  },[edges]);

  const unconnectedDevices = useMemo(()=>devices.filter(d=>!connectedDeviceIds.has(d.id)),[devices,connectedDeviceIds]);
  const placedDeviceIds = useMemo(()=>new Set(placements.map(p=>p.device_id)),[placements]);
  const unplacedDevices = useMemo(()=>devices.filter(d=>!placedDeviceIds.has(d.id)),[devices,placedDeviceIds]);

  if(loading){
    return <>
      <h2>ダッシュボード</h2>
      <div className="card">読み込み中...</div>
    </>;
  }

  return <>
    <div className="page-title-row">
      <h2>ダッシュボード</h2>
      <button onClick={load}>再読み込み</button>
    </div>

    <div className="stable-notice">
      
      
    </div>

    {message&&<div className="status-message error">{message}</div>}

    <div className="dashboard-stat-grid">
      <Link className="dashboard-stat-card" to="/rooms"><span>部屋</span><strong>{rooms.length}</strong></Link>
      <Link className="dashboard-stat-card" to="/devices"><span>機器</span><strong>{devices.length}</strong></Link>
      <Link className="dashboard-stat-card" to="/diagram"><span>接続</span><strong>{edges.length}</strong></Link>
      <Link className="dashboard-stat-card" to="/room-layout"><span>配置</span><strong>{placements.length}</strong></Link>
      <div className="dashboard-stat-card"><span>機器写真</span><strong>{devicePhotos.length}</strong></div>
      <div className="dashboard-stat-card"><span>部屋写真</span><strong>{roomPhotos.length}</strong></div>
      <div className="dashboard-stat-card"><span>登録URL</span><strong>{deviceUrls.length}</strong></div>
      <Link className="dashboard-stat-card" to="/monitoring"><span>監視オンライン</span><strong>{monitors.filter(m=>m.status==='online').length}/{monitors.length}</strong></Link>
    </div>

    <div className="dashboard-grid">
      <div className="card">
        <h3>機器種別</h3>
        <div className="type-count-list">
          {deviceTypeCounts.map(([type,count])=><div className="type-count-row" key={type}><span>{type}</span><strong>{count}</strong></div>)}
          {deviceTypeCounts.length===0&&<p className="photo-hint">機器未登録</p>}
        </div>
      </div>

      <div className="card">
        <h3>最近追加した機器</h3>
        <div className="dashboard-device-list">
          {recentDevices.map(d=>{
            const icon=getDeviceIcon(d.icon,d.device_type);
            return <Link className="dashboard-device-row" key={d.id} to={`/devices/${d.id}?edit=1`}><span>{icon.mark}</span><div><strong>{d.name}</strong><small>{d.device_type || '-'} / {d.vendor || '-'}</small></div></Link>
          })}
          {recentDevices.length===0&&<p className="photo-hint">機器未登録</p>}
        </div>
      </div>

      <div className="card">
        <h3>未接続の機器</h3>
        <p className="photo-hint">構成図・配線管理にまだ接続登録がない機器です。</p>
        <div className="dashboard-chip-list">
          {unconnectedDevices.slice(0,12).map(d=><Link className="dashboard-chip" key={d.id} to={`/devices/${d.id}?edit=1`}>{getDeviceIcon(d.icon,d.device_type).mark} {d.name}</Link>)}
          {unconnectedDevices.length===0&&<span className="dashboard-ok">すべて接続登録済み</span>}
        </div>
      </div>

      <div className="card">
        <h3>部屋未配置の機器</h3>
        <p className="photo-hint">部屋レイアウトにまだ配置していない機器です。</p>
        <div className="dashboard-chip-list">
          {unplacedDevices.slice(0,12).map(d=><Link className="dashboard-chip" key={d.id} to="/room-layout">{getDeviceIcon(d.icon,d.device_type).mark} {d.name}</Link>)}
          {unplacedDevices.length===0&&<span className="dashboard-ok">すべて配置済み</span>}
        </div>
      </div>
    </div>

    <div className="card">
      <h3>ホームラボ健康状態</h3>
      <p className="photo-hint">Dockerコンテナの稼働率、主要サービス、停止中コンテナを確認できます。</p>
      <div className="dashboard-action-row">
        <Link className="small-button" to="/homelab">ホームラボ統合</Link>
        <Link className="small-button" to="/health">健康状態を開く</Link>
        <Link className="small-button" to="/monitoring">監視を開く</Link>
      </div>
    </div>

    <div className="card">
      <h3>主要URLショートカット</h3>
      <div className="url-card-list">
        {deviceUrls.slice(0,12).map(u=><a className="device-url-card" key={u.id} href={u.url} target="_blank" rel="noreferrer"><strong>{u.name}</strong><span>{u.url_type}</span><small>{u.url}</small></a>)}
        {deviceUrls.length===0&&<p className="photo-hint">URL未登録</p>}
      </div>
    </div>

    <div className="card">
      <h3>次に行う作業</h3>
      <div className="dashboard-action-row">
        <Link className="small-button" to="/devices">機器を追加</Link>
        <Link className="small-button" to="/diagram">接続を登録</Link>
        <Link className="small-button" to="/room-layout">部屋に配置</Link>
        <Link className="small-button" to="/backup">バックアップ</Link>
      </div>
    </div>
  </>;
}
