import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Stats = {
  rooms:number;
  devices:number;
  connections:number;
  photos:number;
  monitors:number;
};

export default function DataProtectionPage(){
  const [stats,setStats]=useState<Stats>({rooms:0,devices:0,connections:0,photos:0,monitors:0});
  const [message,setMessage]=useState('');

  const load=async()=>{
    setMessage('');
    try{
      const [rooms,devices,connections,monitors]=await Promise.all([
        api.get('/rooms').catch(()=>({data:[]})),
        api.get('/devices').catch(()=>({data:[]})),
        api.get('/connections').catch(()=>({data:[]})),
        api.get('/monitors').catch(()=>({data:[]})),
      ]);
      setStats({
        rooms: rooms.data?.length || 0,
        devices: devices.data?.length || 0,
        connections: connections.data?.length || 0,
        photos: 0,
        monitors: monitors.data?.length || 0,
      });
    }catch(err:any){
      setMessage(`データ保護情報の取得に失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  useEffect(()=>{load()},[]);

  return <>
    <div className="page-title-row">
      <h2>データ保護</h2>
      <div className="page-actions">
        <Link className="small-button" to="/backup">バックアップ</Link>
        <Link className="small-button" to="/manual">マニュアル</Link>
        <button onClick={load}>再取得</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    <div className="manual-hero">
      <div>
        <span>Ver1.8.0</span>
        <strong>登録データを守るための確認画面</strong>
        <p>機器・部屋・写真・構成図・監視設定を消さないための運用ルールを表示します。</p>
      </div>
    </div>

    <div className="dashboard-stat-grid">
      <div className="dashboard-stat-card"><span>登録部屋</span><strong>{stats.rooms}</strong></div>
      <div className="dashboard-stat-card"><span>登録機器</span><strong>{stats.devices}</strong></div>
      <div className="dashboard-stat-card"><span>接続情報</span><strong>{stats.connections}</strong></div>
      <div className="dashboard-stat-card"><span>監視設定</span><strong>{stats.monitors}</strong></div>
    </div>

    <div className="card warning-card">
      <h3>更新前に必ず守ること</h3>
      <ul>
        <li><code>docker compose down -v</code> は通常更新で使わない</li>
        <li><code>backend/app/data</code> を削除しない</li>
        <li><code>robocopy /MIR</code> は使わない</li>
        <li>更新前にUbuntu側で <code>backend/app/data</code> をコピーする</li>
      </ul>
    </div>

    <div className="card">
      <h3>安全な更新前バックアップ</h3>
      <pre><code>{`cd ~/homenet-map-jp
cp -a backend/app/data backend/app/data.backup.$(date +%Y%m%d_%H%M%S)`}</code></pre>
    </div>

    <div className="card">
      <h3>通常更新コマンド</h3>
      <pre><code>{`git fetch origin
git reset --hard origin/main
docker compose down
docker compose up -d --build --force-recreate
docker compose ps`}</code></pre>
    </div>
  </>;
}
