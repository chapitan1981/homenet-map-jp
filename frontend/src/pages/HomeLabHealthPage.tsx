import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Device } from '../types/device';

type DockerContainer = {
  id:string;
  name:string;
  image:string;
  state:string;
  status:string;
  ports:any;
  category:string;
  priority:number;
  healthy:boolean;
};

type DockerHealth = {
  total:number;
  running:number;
  stopped:number;
  health_rate:number;
  categories:Record<string,number>;
  containers:DockerContainer[];
  stopped_containers:DockerContainer[];
};

const categoryLabel:Record<string,string> = {
  media:'メディア',
  photo:'写真',
  cloud:'クラウド',
  dashboard:'管理',
  document:'文書',
  automation:'自動化',
  database:'DB/キャッシュ',
  proxy:'プロキシ',
  app:'アプリ',
  other:'その他'
};

export default function HomeLabHealthPage(){
  const [health,setHealth]=useState<DockerHealth|null>(null);
  const [devices,setDevices]=useState<Device[]>([]);
  const [selectedDeviceId,setSelectedDeviceId]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const [h,d]=await Promise.all([api.get('/docker/health'), api.get('/devices')]);
      setHealth(h.data);
      setDevices(d.data);
    }catch(err:any){
      setMessage(`Docker健康状態の取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const important = useMemo(()=>health?.containers.filter(c=>c.priority===1).slice(0,18) || [],[health]);
  const stopped = health?.stopped_containers || [];

  const registerMonitors=async()=>{
    setMessage('');
    if(!selectedDeviceId){
      setMessage('Docker監視を紐づける機器を選択してください。例：Ubuntu Server / Docker Host');
      return;
    }
    try{
      const res = await api.post(`/docker/register-monitors/${selectedDeviceId}`);
      setMessage(`Docker監視を登録しました。作成:${res.data.created} / 既存:${res.data.skipped} / 合計:${res.data.total}`);
    }catch(err:any){
      setMessage(`Docker監視登録失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  return <>
    <div className="page-title-row">
      <h2>ホームラボ健康状態</h2>
      <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('選択')?'status-message error':'status-message'}>{message}</div>}

    {health&&<>
      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card monitor-online-card"><span>Docker稼働</span><strong>{health.running}</strong></div>
        <div className="dashboard-stat-card monitor-offline-card"><span>停止</span><strong>{health.stopped}</strong></div>
        <div className="dashboard-stat-card"><span>総コンテナ</span><strong>{health.total}</strong></div>
        <div className="dashboard-stat-card"><span>Docker正常率</span><strong>{health.health_rate}%</strong></div>
      </div>

      {stopped.length>0&&<div className="card warning-card">
        <h3>停止中コンテナ</h3>
        <div className="docker-container-grid">
          {stopped.map(c=><div className="docker-container-card stopped-card" key={c.id}>
            <strong>🐳 {c.name}</strong>
            <span className="docker-stopped">{c.state}</span>
            <small>{c.image}</small>
            <small>{c.status}</small>
          </div>)}
        </div>
      </div>}

      <div className="card">
        <h3>主要サービス</h3>
        <div className="health-service-grid">
          {important.map(c=><div className={`health-service-card ${c.healthy?'ok':'ng'}`} key={c.id}>
            <div className="health-service-title">
              <strong>{c.healthy?'🟢':'🔴'} {c.name}</strong>
              <span>{categoryLabel[c.category] || c.category}</span>
            </div>
            <small>{c.image}</small>
            <small>{c.status}</small>
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>カテゴリ別</h3>
        <div className="type-count-list">
          {Object.entries(health.categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div className="type-count-row" key={k}><span>{categoryLabel[k] || k}</span><strong>{v}</strong></div>)}
        </div>
      </div>

      <div className="card">
        <h3>Docker監視を一括登録</h3>
        <p className="photo-hint">Dockerホストに該当する機器を選ぶと、現在のコンテナをDocker監視として一括登録します。既存登録はスキップします。</p>
        <div className="inline-form">
          <select value={selectedDeviceId} onChange={e=>setSelectedDeviceId(e.target.value)}>
            <option value="">Dockerホスト機器を選択</option>
            {devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={registerMonitors}>Docker監視を一括登録</button>
        </div>
      </div>

      <div className="card">
        <h3>全Dockerコンテナ</h3>
        <table className="table">
          <thead><tr><th>状態</th><th>名前</th><th>カテゴリ</th><th>イメージ</th><th>ステータス</th></tr></thead>
          <tbody>
            {health.containers.map(c=><tr key={c.id}>
              <td><span className={c.healthy?'monitor-status online':'monitor-status offline'}>{c.healthy?'稼働':'停止'}</span></td>
              <td>🐳 {c.name}</td>
              <td>{categoryLabel[c.category] || c.category}</td>
              <td>{c.image}</td>
              <td>{c.status}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </>}

    {!health&&!message&&<div className="card">読み込み中...</div>}
  </>;
}
