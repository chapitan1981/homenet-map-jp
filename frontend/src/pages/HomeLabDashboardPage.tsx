import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Service = {
  id:string;
  name:string;
  image:string;
  state:string;
  status:string;
  ports:any;
  category:string;
  url:string;
  priority:number;
  healthy:boolean;
};

type Summary = {
  host:{
    hostname:string;
    platform:string;
    cpu_count:number;
    uptime:string;
    loadavg:number[]|null;
    memory:{total_mb:number;used_mb:number;available_mb:number;used_percent:number};
    disk:{total_gb:number;used_gb:number;free_gb:number;used_percent:number};
  };
  docker:{total:number;running:number;stopped:number;health_rate:number};
  alerts:Service[];
  important_services:Service[];
  launchers:Service[];
};

const catIcon:Record<string,string> = {
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

function pctClass(v:number){
  if(v >= 90) return 'bad';
  if(v >= 75) return 'warn';
  return 'good';
}

export default function HomeLabDashboardPage(){
  const [summary,setSummary]=useState<Summary|null>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const [launcherFilter,setLauncherFilter]=useState('');

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const res = await api.get('/homelab/summary');
      setSummary(res.data);
    }catch(err:any){
      setMessage(`ホームラボ統合情報の取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const launchers = useMemo(()=>{
    if(!summary) return [];
    const key = launcherFilter.toLowerCase();
    return summary.launchers.filter(s=>!key || s.name.toLowerCase().includes(key) || s.image.toLowerCase().includes(key));
  },[summary,launcherFilter]);

  return <>
    <div className="page-title-row">
      <h2>ホームラボ統合ダッシュボード</h2>
      <div className="page-actions">
        <Link className="small-button" to="/health">健康状態</Link>
        <Link className="small-button" to="/monitoring">監視</Link>
        <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    {summary&&<>
      <div className={`homelab-hero ${summary.docker.health_rate>=95?'good':summary.docker.health_rate>=80?'warn':'bad'}`}>
        <div>
          <span>ホームラボ総合状態</span>
          <strong>{summary.docker.health_rate}%</strong>
          <p>{summary.docker.running}/{summary.docker.total} Dockerコンテナ稼働中</p>
        </div>
        <div className="homelab-hero-right">
          <span>{summary.alerts.length===0?'🟢 異常なし':'🟡 要確認あり'}</span>
          <small>{summary.host.hostname}</small>
        </div>
      </div>

      {summary.alerts.length>0&&<div className="card warning-card">
        <h3>アラート</h3>
        <div className="alert-list">
          {summary.alerts.map(a=><div className="alert-item" key={a.id}>
            <strong>🔴 {a.name}</strong>
            <span>{a.state}</span>
            <small>{a.image}</small>
          </div>)}
        </div>
      </div>}

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card"><span>CPU</span><strong>{summary.host.cpu_count}</strong></div>
        <div className={`dashboard-stat-card ${pctClass(summary.host.memory?.used_percent||0)}`}><span>RAM</span><strong>{summary.host.memory?.used_percent ?? 0}%</strong></div>
        <div className={`dashboard-stat-card ${pctClass(summary.host.disk?.used_percent||0)}`}><span>Disk</span><strong>{summary.host.disk?.used_percent ?? 0}%</strong></div>
        <div className="dashboard-stat-card"><span>Uptime</span><strong className="stat-small">{summary.host.uptime || '-'}</strong></div>
      </div>

      <div className="card">
        <h3>サービスURLランチャー</h3>
        <div className="inline-form">
          <input placeholder="サービス検索 例: jellyfin / nextcloud / immich" value={launcherFilter} onChange={e=>setLauncherFilter(e.target.value)} />
          <button className="secondary-button" onClick={()=>setLauncherFilter('')}>クリア</button>
        </div>
        <div className="service-launcher-grid">
          {launchers.map(s=><a className={`service-launcher-card ${s.healthy?'ok':'ng'}`} key={s.id} href={s.url} target="_blank" rel="noreferrer">
            <strong>{catIcon[s.category] || '🔧'} {s.name}</strong>
            <span>{s.url}</span>
            <small>{s.image}</small>
          </a>)}
        </div>
      </div>

      <div className="card">
        <h3>主要サービス</h3>
        <div className="health-service-grid">
          {summary.important_services.map(s=><div className={`health-service-card ${s.healthy?'ok':'ng'}`} key={s.id}>
            <div className="health-service-title">
              <strong>{s.healthy?'🟢':'🔴'} {s.name}</strong>
              <span>{catIcon[s.category] || '🔧'} {s.category}</span>
            </div>
            <small>{s.status}</small>
            <small>{s.image}</small>
            {s.url&&<a className="text-link" href={s.url} target="_blank" rel="noreferrer">開く</a>}
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>ホスト情報</h3>
        <table className="table">
          <tbody>
            <tr><th>Hostname</th><td>{summary.host.hostname}</td></tr>
            <tr><th>Platform</th><td>{summary.host.platform}</td></tr>
            <tr><th>Load Average</th><td>{summary.host.loadavg ? summary.host.loadavg.map(v=>v.toFixed(2)).join(' / ') : '-'}</td></tr>
            <tr><th>Memory</th><td>{summary.host.memory?.used_mb ?? '-'}MB / {summary.host.memory?.total_mb ?? '-'}MB</td></tr>
            <tr><th>Disk</th><td>{summary.host.disk?.used_gb ?? '-'}GB / {summary.host.disk?.total_gb ?? '-'}GB</td></tr>
          </tbody>
        </table>
      </div>
    </>}

    {!summary&&!message&&<div className="card">読み込み中...</div>}
  </>;
}
