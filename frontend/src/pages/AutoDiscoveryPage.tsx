import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type Service = {
  id:string;
  name:string;
  label:string;
  image:string;
  state:string;
  status:string;
  category:string;
  url:string;
  healthy:boolean;
  recommended:boolean;
};

type Discovery = {
  host:{name:string;ip:string;type:string};
  services:Service[];
  recommended_services:Service[];
  alerts:Service[];
  topology:{root:string;children:any[]};
  external_candidates:{name:string;ip:string;checks:string[]}[];
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

export default function AutoDiscoveryPage(){
  const [data,setData]=useState<Discovery|null>(null);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const [filter,setFilter]=useState('recommended');

  const load=async()=>{
    setLoading(true);
    setMessage('');
    try{
      const res = await api.get('/homelab/discovery');
      setData(res.data);
    }catch(err:any){
      setMessage(`自動検出失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{load()},[]);

  const categories = useMemo(()=>{
    if(!data) return {};
    const out:Record<string,number> = {};
    data.services.forEach(s=>{out[s.category]=(out[s.category]||0)+1});
    return out;
  },[data]);

  const visible = useMemo(()=>{
    if(!data) return [];
    if(filter === 'recommended') return data.recommended_services;
    if(filter === 'all') return data.services;
    return data.services.filter(s=>s.category === filter);
  },[data,filter]);

  return <>
    <div className="page-title-row">
      <h2>自動ホームラボ検出</h2>
      <div className="page-actions">
        <Link className="small-button" to="/homelab">ホームラボ</Link>
        <Link className="small-button" to="/health">健康状態</Link>
        <button onClick={load} disabled={loading}>{loading?'検出中...':'再検出'}</button>
      </div>
    </div>

    {message&&<div className="status-message error">{message}</div>}

    {data&&<>
      <div className="homelab-hero good">
        <div>
          <span>検出ホスト</span>
          <strong>{data.host.name}</strong>
          <p>{data.host.ip} / {data.services.length} コンテナ検出 / 推奨 {data.recommended_services.length} 件</p>
        </div>
        <div className="homelab-hero-right">
          <span>{data.alerts.length===0?'🟢 異常なし':'🟡 停止あり'}</span>
          <small>Docker Discovery</small>
        </div>
      </div>

      {data.alerts.length>0&&<div className="card warning-card">
        <h3>停止中・要確認</h3>
        <div className="alert-list">
          {data.alerts.map(s=><div className="alert-item" key={s.id}>
            <strong>🔴 {s.name}</strong>
            <span>{s.state}</span>
            <small>{s.image}</small>
          </div>)}
        </div>
      </div>}

      <div className="card">
        <h3>カテゴリフィルタ</h3>
        <div className="health-category-grid">
          <button className={`health-category-card ${filter==='recommended'?'active':''}`} onClick={()=>setFilter('recommended')}>
            <span>⭐ 推奨</span><strong>{data.recommended_services.length}</strong>
          </button>
          <button className={`health-category-card ${filter==='all'?'active':''}`} onClick={()=>setFilter('all')}>
            <span>🧩 すべて</span><strong>{data.services.length}</strong>
          </button>
          {Object.entries(categories).sort((a,b)=>b[1]-a[1]).map(([k,v])=><button className={`health-category-card ${filter===k?'active':''}`} key={k} onClick={()=>setFilter(k)}>
            <span>{categoryIcon[k] || '🔧'} {categoryLabel[k] || k}</span><strong>{v}</strong>
          </button>)}
        </div>
      </div>

      <div className="card">
        <h3>検出サービス</h3>
        <div className="service-launcher-grid">
          {visible.map(s=><div className={`service-launcher-card ${s.healthy?'ok':'ng'}`} key={s.id}>
            <strong>{s.healthy?'🟢':'🔴'} {s.label}</strong>
            <span>{categoryIcon[s.category] || '🔧'} {categoryLabel[s.category] || s.category}</span>
            <small>{s.name}</small>
            <small>{s.image}</small>
            {s.url&&<a className="text-link" href={s.url} target="_blank" rel="noreferrer">開く：{s.url}</a>}
          </div>)}
        </div>
      </div>

      <div className="card">
        <h3>構成図候補</h3>
        <div className="topology-tree">
          <div className="topology-root">🖥️ {data.topology.root}</div>
          <div className="topology-children">
            {data.topology.children.map((c:any,idx:number)=><div className="topology-child" key={`${c.name}-${idx}`}>
              <span>├ {categoryIcon[c.category] || '🔧'} {c.child}</span>
              <small>{c.name}</small>
            </div>)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>外部機器候補</h3>
        <p className="photo-hint">固定IP機器は次バージョンでPing/HTTP/TCP監視テンプレートとして一括登録予定です。</p>
        <div className="health-service-grid">
          {data.external_candidates.map(x=><div className="health-service-card ok" key={x.name}>
            <div className="health-service-title"><strong>🖥️ {x.name}</strong><span>{x.ip}</span></div>
            <small>{x.checks.join(' / ')}</small>
          </div>)}
        </div>
      </div>
    </>}

    {!data&&!message&&<div className="card">読み込み中...</div>}
  </>;
}
