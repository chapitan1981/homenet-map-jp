import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type StableSummary = {
  overall:string;
  warnings:{level:string;message:string}[];
  docker:{total:number;running:number;stopped:number;health_rate:number;stopped_items:any[]};
  checks:any;
  disks:any[];
  tailscale:any;
  services:any[];
};

const statusMark = (s:string)=>s==='online'?'🟢':s==='ok'?'🟢':s==='warning'?'🟡':s==='offline'?'🔴':'⚪';

export default function StableDashboardPage(){
  const [data,setData]=useState<StableSummary|null>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const res = await api.get('/homelab/stable-summary');
      setData(res.data);
    }catch(err:any){
      setMessage(`Stableダッシュボード取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  return <>
    <div className="page-title-row">
      <h2>ホームラボ Stable</h2>
      <div className="page-actions">
        <Link className="small-button" to="/homelab">ホームラボ</Link>
        <Link className="small-button" to="/discovery">自動検出</Link>
        <Link className="small-button" to="/monitoring">監視</Link>
        <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    {data&&<>
      <div className={`stable-hero ${data.overall}`}>
        <div>
          <span>総合状態</span>
          <strong>{data.overall==='ok'?'正常':data.overall==='warning'?'要確認':'異常'}</strong>
          <p>Docker正常率 {data.docker.health_rate}% / {data.docker.running}/{data.docker.total} 稼働</p>
        </div>
        <div className="stable-hero-mark">{data.overall==='ok'?'🟢':data.overall==='warning'?'🟡':'🔴'}</div>
      </div>

      {data.warnings.length>0&&<div className="card warning-card">
        <h3>警告</h3>
        <div className="alert-list">
          {data.warnings.map((w,idx)=><div className="alert-item" key={idx}>
            <strong>🟡 {w.message}</strong>
          </div>)}
        </div>
      </div>}

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card monitor-online-card"><span>Docker稼働</span><strong>{data.docker.running}</strong></div>
        <div className="dashboard-stat-card monitor-offline-card"><span>停止</span><strong>{data.docker.stopped}</strong></div>
        <div className="dashboard-stat-card"><span>正常率</span><strong>{data.docker.health_rate}%</strong></div>
        <div className="dashboard-stat-card"><span>主要サービス</span><strong>{data.services.length}</strong></div>
      </div>

      <div className="card">
        <h3>インフラ監視</h3>
        <div className="stable-check-grid">
          {Object.entries(data.checks).map(([key,v]:any)=><div className="stable-check-card" key={key}>
            <h4>{v.name}</h4>
            <p>{v.ip}</p>
            {Object.entries(v).filter(([k])=>!['name','ip'].includes(k)).map(([k,c]:any)=><div className="stable-check-row" key={k}>
              <span>{statusMark(c.status)} {k}</span><small>{c.status} {c.response_ms?`${c.response_ms}ms`:''}</small>
            </div>)}
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>ストレージ</h3>
        <div className="stable-check-grid">
          {data.disks.map((d:any)=><div className={`stable-check-card ${d.status}`} key={d.path}>
            <h4>{statusMark(d.status)} {d.path}</h4>
            <p>{d.used_gb}GB / {d.total_gb}GB 使用中</p>
            <div className="meter"></div>
            <small>使用率 {d.used_percent}% / 空き {d.free_gb}GB</small>
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>Tailscale</h3>
        <div className="stable-check-card">
          <h4>{data.tailscale.available ? statusMark(data.tailscale.status) : '⚪'} {data.tailscale.status}</h4>
          <p>{data.tailscale.available ? (data.tailscale.hostname || '-') : (data.tailscale.error || 'コンテナ内でtailscaleコマンド未検出')}</p>
          {data.tailscale.tailscale_ips&&<small>{data.tailscale.tailscale_ips.join(' / ')}</small>}
        </div>
      </div>

      <div className="card">
        <h3>ランチャー</h3>
        <div className="service-launcher-grid">
          {data.services.filter(s=>s.url).map(s=><a className={`service-launcher-card ${s.healthy?'ok':'ng'}`} key={s.id} href={s.url} target="_blank" rel="noreferrer">
            <strong>{s.healthy?'🟢':'🔴'} {s.label || s.name}</strong>
            <span>{s.url}</span>
            <small>{s.image}</small>
          </a>)}
        </div>
      </div>
    </>}

    {!data&&!message&&<div className="card">読み込み中...</div>}
  </>;
}
