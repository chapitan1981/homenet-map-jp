import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const categoryIcon:Record<string,string> = {
  media:'🎬',
  photo:'📷',
  cloud:'☁️',
  dashboard:'📊',
  document:'📄',
  automation:'⚙️',
  database:'🗄️',
  proxy:'🌐',
  app:'📦',
  other:'🔧'
};

function portSummary(ports:any){
  if(!ports) return '-';
  const rows:string[] = [];
  Object.entries(ports).forEach(([containerPort, mappings]:any)=>{
    if(Array.isArray(mappings)){
      mappings.forEach((m:any)=>rows.push(`${m.HostPort || '-'}→${containerPort}`));
    }else{
      rows.push(`${containerPort}`);
    }
  });
  return rows.length ? rows.join(', ') : '-';
}

export default function HomeLabHealthPage(){
  const [health,setHealth]=useState<DockerHealth|null>(null);
  const [devices,setDevices]=useState<Device[]>([]);
  const [selectedDeviceId,setSelectedDeviceId]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState('all');
  const [showAll,setShowAll]=useState(false);

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

  const important = useMemo(()=>health?.containers.filter(c=>c.priority===1).slice(0,24) || [],[health]);
  const stopped = health?.stopped_containers || [];

  const filteredContainers = useMemo(()=>{
    if(!health) return [];
    let list = health.containers;
    if(filter !== 'all'){
      list = list.filter(c=>c.category === filter);
    }
    return showAll ? list : list.slice(0,30);
  },[health,filter,showAll]);

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

  const healthClass = health ? (health.health_rate >= 95 ? 'good' : health.health_rate >= 80 ? 'warn' : 'bad') : 'unknown';

  return <>
    <div className="page-title-row">
      <h2>ホームラボ健康状態</h2>
      <div className="page-actions">
        <Link className="small-button" to="/monitoring">監視画面</Link>
        <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
      </div>
    </div>

    {message&&<div className={message.includes('失敗')||message.includes('選択')?'status-message error':'status-message'}>{message}</div>}

    {health&&<>
      <div className={`health-hero ${healthClass}`}>
        <div>
          <span>Docker正常率</span>
          <strong>{health.health_rate}%</strong>
          <p>{health.running} / {health.total} コンテナ稼働中</p>
        </div>
        <div className="health-hero-status">{health.stopped===0?'🟢 全体良好':'🟡 要確認あり'}</div>
      </div>

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card monitor-online-card"><span>稼働中</span><strong>{health.running}</strong></div>
        <div className="dashboard-stat-card monitor-offline-card"><span>停止中</span><strong>{health.stopped}</strong></div>
        <div className="dashboard-stat-card"><span>総コンテナ</span><strong>{health.total}</strong></div>
        <div className="dashboard-stat-card"><span>カテゴリ数</span><strong>{Object.keys(health.categories).length}</strong></div>
      </div>

      {stopped.length>0&&<div className="card warning-card">
        <h3>停止中コンテナ</h3>
        <p className="photo-hint">意図して停止しているもの以外は確認してください。</p>
        <div className="docker-container-grid">
          {stopped.map(c=><div className="docker-container-card stopped-card" key={c.id}>
            <strong>🔴 {c.name}</strong>
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
              <span>{categoryIcon[c.category] || '🔧'} {categoryLabel[c.category] || c.category}</span>
            </div>
            <small>{c.image}</small>
            <small>{c.status}</small>
            <small>Ports: {portSummary(c.ports)}</small>
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>カテゴリ別サマリー</h3>
        <div className="health-category-grid">
          {Object.entries(health.categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=><button className={`health-category-card ${filter===k?'active':''}`} key={k} onClick={()=>setFilter(k)}>
            <span>{categoryIcon[k] || '🔧'} {categoryLabel[k] || k}</span>
            <strong>{v}</strong>
          </button>)}
          <button className={`health-category-card ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>
            <span>🧩 すべて</span>
            <strong>{health.total}</strong>
          </button>
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
        <div className="page-title-row">
          <h3>Dockerコンテナ一覧</h3>
          <button className="small-button" onClick={()=>setShowAll(!showAll)}>{showAll?'30件まで表示':'全件表示'}</button>
        </div>
        <p className="photo-hint">現在のフィルタ：{filter==='all'?'すべて':categoryLabel[filter] || filter}</p>
        <table className="table">
          <thead><tr><th>状態</th><th>名前</th><th>カテゴリ</th><th>ポート</th><th>イメージ</th><th>ステータス</th></tr></thead>
          <tbody>
            {filteredContainers.map(c=><tr key={c.id}>
              <td><span className={c.healthy?'monitor-status online':'monitor-status offline'}>{c.healthy?'稼働':'停止'}</span></td>
              <td>🐳 {c.name}</td>
              <td>{categoryIcon[c.category] || '🔧'} {categoryLabel[c.category] || c.category}</td>
              <td>{portSummary(c.ports)}</td>
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
