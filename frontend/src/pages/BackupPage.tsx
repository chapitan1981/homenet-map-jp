import { useEffect, useState } from 'react';
import { api } from '../api/client';

type BackupSummary = {
  version:string;
  table_counts: Record<string, number>;
  uploads_count:number;
  uploads_size_bytes:number;
  zip_export:string;
  json_export:string;
};

export default function BackupPage() {
  const [summary,setSummary]=useState<BackupSummary|null>(null);
  const [message,setMessage]=useState('');

  const load=async()=>{
    setMessage('');
    try{
      const res = await api.get('/backup/summary');
      setSummary(res.data);
    }catch(err:any){
      setMessage(`バックアップ情報の取得失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  useEffect(()=>{load()},[]);

  const apiBase = api.defaults.baseURL || '/api';
  const jsonUrl = `${apiBase}/backup/export`;
  const zipUrl = `${apiBase}/backup/export-zip`;
  const sizeMB = summary ? (summary.uploads_size_bytes / 1024 / 1024).toFixed(2) : '0.00';

  return (
    <>
      <div className="page-title-row">
        <h2>バックアップ</h2>
        <button onClick={load}>再読み込み</button>
      </div>

      {message&&<div className="status-message error">{message}</div>}

      <div className="card">
        <h3>バックアップ出力</h3>
        <p className="photo-hint">Ver0.4.9では、従来のJSONに加えて、写真・DBコピー・JSONをまとめたZIP Exportに対応しました。</p>
        <div className="backup-action-grid">
          <a className="backup-download-card" href={zipUrl} target="_blank" rel="noreferrer">
            <strong>ZIP Export</strong>
            <span>写真・DB・JSONをまとめて保存</span>
          </a>
          <a className="backup-download-card" href={jsonUrl} target="_blank" rel="noreferrer">
            <strong>JSON Export</strong>
            <span>データベース内容をJSONで保存</span>
          </a>
        </div>
      </div>

      <div className="card">
        <h3>バックアップ概要</h3>
        {!summary&&<p className="photo-hint">読み込み中...</p>}
        {summary&&<>
          <div className="dashboard-stat-grid">
            <div className="dashboard-stat-card"><span>アップロード写真</span><strong>{summary.uploads_count}</strong></div>
            <div className="dashboard-stat-card"><span>写真容量</span><strong>{sizeMB}MB</strong></div>
            <div className="dashboard-stat-card"><span>バックアップ版</span><strong>{summary.version}</strong></div>
          </div>
          <table className="table">
            <thead><tr><th>テーブル</th><th>件数</th></tr></thead>
            <tbody>
              {Object.entries(summary.table_counts).map(([k,v])=><tr key={k}><td>{k}</td><td>{v}</td></tr>)}
            </tbody>
          </table>
        </>}
      </div>

      <div className="card">
        <h3>復元について</h3>
        <p>Ver0.4.9では安全性優先のため、復元はまだ自動化していません。ZIP Exportで退避し、Ver0.5.xで確認画面付きZIP Importを追加予定です。</p>
      </div>
    </>
  );
}
