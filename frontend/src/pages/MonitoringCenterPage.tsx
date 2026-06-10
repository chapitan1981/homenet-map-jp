import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type CenterData = {
  overall:string;
  top_alerts:{level:string;message:string;source:string}[];
  summary:any;
  nodes:any;
  host:any;
  tailscale:any;
  docker:any;
  services:any[];
};

const mark=(s:string)=>s==='online'||s==='ok'?'🟢':s==='warning'?'🟡':s==='offline'?'🔴':'⚪';

const categoryLabel:Record<string,string>={
  media:'メディア', photo:'写真', cloud:'クラウド', dashboard:'管理', document:'文書',
  automation:'自動化', database:'DB/キャッシュ', proxy:'プロキシ', app:'アプリ', other:'その他'
};

const categoryIcon:Record<string,string>={
  media:'🎬', photo:'📷', cloud:'☁️', dashboard:'📊', document:'📄',
  automation:'⚙️', database:'🗄️', proxy:'🌐', app:'📦', other:'🔧'
};

function NodeCard({node}:{node:any}){
  if(!node) return null;
  return <div className="monitor-center-node-card">
    <h3>🖥️ {node.name}</h3>
    <p>{node.ip}</p>
    {Object.entries(node.checks || {}).map(([k,v]:any)=><div className="stable-check-row" key={k}>
      <span>{mark(v.status)} {k}</span>
      <small>{v.display || `${v.status}${v.method_display ? ' / '+v.method_display : ''}`}</small>
    </div>)}
  </div>;
}

export default function MonitoringCenterPage(){
  const [data,setData]=useState<CenterData|null>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const res=await api.get('/homelab/monitoring-center');
      setData(res.data);
    }catch(err:any){
      setMessage(`統合監視センター取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  return <>
    <div className="page-title-row">
      <h2>ホームラボ統合監視センター</h2>
      <div className="page-actions">
        <Link className="small-button" to="/infra">インフラ監視</Link>
        <Link className="small-button" to="/homelab">ホームラボ</Link>
        <Link className="small-button" to="/health">健康状態</Link>
        <button onClick={load} disabled={loading}>{loading?'取得中...':'再取得'}</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    {data&&<>
      <div className={`monitor-center-hero ${data.overall}`}>
        <div>
          <span>総合状態</span>
          <strong>{data.overall==='ok'?'全体正常':'要確認'}</strong>
          <p>Docker {data.summary.docker_running}/{data.summary.docker_total} 稼働 / 警告 {data.summary.warning_count} 件</p>
        </div>
        <div className="monitor-center-hero-mark">{data.overall==='ok'?'🟢':'🟡'}</div>
      </div>

      {data.top_alerts.length>0&&<div className="card warning-card">
        <h3>重要アラート</h3>
        <div className="alert-list">
          {data.top_alerts.map((a,idx)=><div className="alert-item" key={idx}>
            <strong>🟡 {a.message}</strong>
            <small>{a.source}</small>
          </div>)}
        </div>
      </div>}

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card monitor-online-card"><span>Docker正常率</span><strong>{data.summary.docker_health_rate}%</strong></div>
        <div className="dashboard-stat-card"><span>稼働</span><strong>{data.summary.docker_running}</strong></div>
        <div className="dashboard-stat-card"><span>停止</span><strong>{data.summary.docker_stopped}</strong></div>
        <div className="dashboard-stat-card"><span>除外済み</span><strong>{data.summary.ignored_count}</strong></div>
        <div className="dashboard-stat-card"><span>RAM</span><strong>{data.summary.ram_percent}%</strong></div>
      </div>

      <div className="card">
        <h3>主要インフラ</h3>
        <div className="monitor-center-node-grid">
          <NodeCard node={data.nodes.ubuntu}/>
          <NodeCard node={data.nodes.truenas}/>
          <NodeCard node={data.nodes.proxmox}/>
        </div>
      </div>

      <div className="card">
        <h3>Tailscale</h3>
        <div className="monitor-center-node-card">
          <h3>{mark(data.tailscale.status)} {data.tailscale.status_label || data.tailscale.display_label || data.tailscale.status}</h3>
          <p>{data.tailscale.hostname || 'ubuntu-hyper-v'}</p>
          <small>{data.tailscale.tailscale_ips?.join(' / ') || '-'}</small>
        </div>
      </div>

      <div className="card">
        <h3>サービスランチャー</h3>
        <div className="service-launcher-grid">
          {data.services.filter(s=>s.url).map(s=><a className={`service-launcher-card ${s.healthy?'ok':'ng'}`} key={s.id} href={s.url} target="_blank" rel="noreferrer">
            <strong>{s.healthy?'🟢':'🔴'} {categoryIcon[s.category] || '🔧'} {s.label || s.name}</strong>
            <span>{s.url}</span>
            <small>{categoryLabel[s.category] || s.category} / {s.image}</small>
          </a>)}
        </div>
      </div>

      <div className="card">
        <h3>Dockerカテゴリ</h3>
        <div className="health-category-grid">
          {Object.entries(data.docker.categories || {}).sort((a:any,b:any)=>b[1]-a[1]).map(([k,v]:any)=><div className="health-category-card" key={k}>
            <span>{categoryIcon[k] || '🔧'} {categoryLabel[k] || k}</span><strong>{v}</strong>
          </div>)}
        </div>
      </div>

      {(data.docker.ignored || []).length>0&&<div className="card">
        <h3>Docker除外済み</h3>
        <p className="photo-hint">意図的に停止しているため警告から除外しています。</p>
        <div className="docker-container-grid">
          {data.docker.ignored.map((c:any)=><div className="docker-container-card ignored-card" key={c.id}>
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
