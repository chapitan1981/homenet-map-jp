import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type InfraSummary = {
  overall:string;
  host:any;
  tailscale:any;
  docker:{total:number;running:number;stopped:number;health_rate:number;categories:Record<string,number>;unhealthy:any[];ignored?:any[]};
  infra:any[];
  warnings:{level:string;message:string}[];
  ignored_count?:number;
};

const mark=(s:string)=>s==='online'||s==='ok'?'🟢':s==='warning'?'🟡':s==='offline'?'🔴':'⚪';

const catLabel:Record<string,string>={
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

function checkDisplay(v:any){
  if(!v) return '-';
  if(v.display) return v.display;
  if(v.method_display) return `${v.status} / ${v.method_display}`;
  return v.status || '-';
}

export default function InfrastructureMonitorPage(){
  const [data,setData]=useState<InfraSummary|null>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const res=await api.get('/homelab/infra-summary-clean');
      setData(res.data);
    }catch(err:any){
      setMessage(`インフラ監視取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  return <>
    <div className="page-title-row">
      <h2>インフラ監視</h2>
      <div className="page-actions">
        <Link className="small-button" to="/center">統合監視</Link>
        <Link className="small-button" to="/stable">Stable</Link>
        <Link className="small-button" to="/homelab">ホームラボ</Link>
        <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    {data&&<>
      <div className={`stable-hero ${data.overall}`}>
        <div>
          <span>インフラ総合状態</span>
          <strong>{data.overall==='ok'?'正常':'要確認'}</strong>
          <p>Docker {data.docker.running}/{data.docker.total} 稼働 / 警告 {data.warnings.length} 件</p>
        </div>
        <div className="stable-hero-mark">{data.overall==='ok'?'🟢':'🟡'}</div>
      </div>

      {data.warnings.length>0&&<div className="card warning-card">
        <h3>警告一覧</h3>
        <div className="alert-list">
          {data.warnings.map((w,idx)=><div className="alert-item" key={idx}><strong>🟡 {w.message}</strong></div>)}
        </div>
      </div>}

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card"><span>CPU Core</span><strong>{data.host.cpu_count}</strong></div>
        <div className="dashboard-stat-card"><span>RAM</span><strong>{data.host.memory?.used_percent ?? 0}%</strong></div>
        <div className="dashboard-stat-card"><span>Docker正常率</span><strong>{data.docker.health_rate}%</strong></div>
        <div className="dashboard-stat-card"><span>停止</span><strong>{data.docker.stopped}</strong></div>
        <div className="dashboard-stat-card"><span>除外済み</span><strong>{data.ignored_count || data.docker.ignored?.length || 0}</strong></div>
      </div>

      <div className="card">
        <h3>Ubuntuホスト</h3>
        <div className="stable-check-grid">
          <div className="stable-check-card">
            <h4>🖥️ {data.host.hostname}</h4>
            <p>{data.host.platform}</p>
            <div className="stable-check-row"><span>Uptime</span><small>{data.host.uptime || '-'}</small></div>
            <div className="stable-check-row"><span>Load</span><small>{data.host.loadavg ? data.host.loadavg.map((v:number)=>v.toFixed(2)).join(' / ') : '-'}</small></div>
            <div className="stable-check-row"><span>Memory</span><small>{data.host.memory?.used_mb}MB / {data.host.memory?.total_mb}MB</small></div>
          </div>
          {data.host.disk?.map((d:any)=><div className={`stable-check-card ${d.status}`} key={d.path}>
            <h4>{mark(d.status)} Disk {d.path}</h4>
            <p>{d.used_gb}GB / {d.total_gb}GB</p>
            <div className="meter"><span style={{width:`${d.used_percent||0}%`}}></span></div>
            <small>使用率 {d.used_percent}% / 空き {d.free_gb}GB</small>
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>Tailscale</h3>
        <div className="stable-check-card">
          <h4>{mark(data.tailscale.status)} {data.tailscale.status_label || data.tailscale.status}</h4>
          <p>{data.tailscale.display_label || data.tailscale.hostname || data.tailscale.error || '-'}</p>
          <small>{data.tailscale.tailscale_ips?.join(' / ') || data.tailscale.hint || '-'}</small>
        </div>
      </div>

      <div className="card">
        <h3>固定インフラ監視</h3>
        <div className="stable-check-grid">
          {data.infra.map((node:any)=><div className="stable-check-card" key={node.name}>
            <h4>🖥️ {node.name}</h4>
            <p>{node.ip}</p>
            {Object.entries(node.checks).map(([k,v]:any)=><div className="stable-check-row" key={k}>
              <span>{mark(v.status)} {k}</span><small>{checkDisplay(v)}</small>
            </div>)}
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>Dockerカテゴリ</h3>
        <div className="health-category-grid">
          {Object.entries(data.docker.categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div className="health-category-card" key={k}>
            <span>{catLabel[k] || k}</span><strong>{v}</strong>
          </div>)}
        </div>
      </div>

      {data.docker.unhealthy.length>0&&<div className="card warning-card">
        <h3>Docker要確認</h3>
        <div className="docker-container-grid">
          {data.docker.unhealthy.map((c:any)=><div className="docker-container-card stopped-card" key={c.id}>
            <strong>🔴 {c.name}</strong>
            <span className="docker-stopped">{c.state}</span>
            <small>{c.image}</small>
            <small>{c.status}</small>
          </div>)}
        </div>
      </div>}

      {(data.docker.ignored || []).length>0&&<div className="card">
        <h3>Docker除外済み</h3>
        <p className="photo-hint">意図的に停止しているため警告から除外しています。</p>
        <div className="docker-container-grid">
          {data.docker.ignored?.map((c:any)=><div className="docker-container-card ignored-card" key={c.id}>
            <strong>⚪ {c.name}</strong>
            <span>{c.state}</span>
            <small>{c.image}</small>
          </div>)}
        </div>
      </div>}
    </>}

    {!data&&!message&&<div className="card">読み込み中...</div>}
  </>;
}
