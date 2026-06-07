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

type InspectResult = {
  filename:string;
  has_backup_json:boolean;
  has_db:boolean;
  uploads_count:number;
  version:string;
  created_at:string;
  table_counts: Record<string, number>;
  can_restore:boolean;
  note:string;
};

export default function BackupPage() {
  const [summary,setSummary]=useState<BackupSummary|null>(null);
  const [message,setMessage]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [inspect,setInspect]=useState<InspectResult|null>(null);
  const [restoring,setRestoring]=useState(false);
  const [restoreConfirmed,setRestoreConfirmed]=useState(false);

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

  const inspectZip=async()=>{
    setMessage('');
    setInspect(null);
    if(!file){ setMessage('ZIPファイルを選択してください。'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try{
      const res = await api.post('/backup/inspect-zip', fd, {headers:{'Content-Type':'multipart/form-data'}});
      setInspect(res.data);
      setRestoreConfirmed(false);
      setMessage('ZIP内容を確認しました。');
    }catch(err:any){
      setMessage(`確認失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  const restoreZip=async()=>{
    setMessage('');
    if(!file){ setMessage('ZIPファイルを選択してください。'); return; }
    if(!inspect?.can_restore){ setMessage('先にZIP内容を確認してください。'); return; }
    if(!restoreConfirmed){ setMessage('復元確認チェックを入れてください。'); return; }
    if(!confirm('現在のDB/写真は安全バックアップ後に復元されます。復元を実行しますか？')) return;

    const fd = new FormData();
    fd.append('file', file);
    try{
      setRestoring(true);
      const res = await api.post('/backup/restore-zip', fd, {headers:{'Content-Type':'multipart/form-data'}});
      setMessage(`${res.data.message} / DB:${res.data.restored_db ? '復元' : 'なし'} / 写真:${res.data.restored_uploads}件`);
      await load();
    }catch(err:any){
      setMessage(`復元失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setRestoring(false);
    }
  };

  return (
    <>
      <div className="page-title-row">
        <h2>バックアップ</h2>
        <button onClick={load}>再読み込み</button>
      </div>

      {message&&<div className={message.includes('失敗')||message.includes('選択')||message.includes('先に')?'status-message error':'status-message'}>{message}</div>}

      <div className="card">
        <h3>バックアップ出力</h3>
        <p className="photo-hint">ZIP Exportは写真・DBコピー・JSONをまとめて保存します。</p>
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
        <h3>ZIP Import / 復元</h3>
        <p className="photo-hint">先にZIP内容を確認し、復元可能な内容か確認してから復元します。復元前のDB/写真はサーバー側へ安全バックアップします。</p>
        <div className="inline-form">
          <input type="file" accept=".zip,application/zip" onChange={e=>{setFile(e.target.files?.[0]||null);setInspect(null);}} />
          <button onClick={inspectZip}>ZIP内容を確認</button>
          <button className="danger-button" onClick={restoreZip} disabled={restoring || !inspect?.can_restore || !restoreConfirmed}>{restoring?'復元中...':'ZIPを復元'}</button>
        </div>
        {inspect&&<div className="restore-inspect-box">
          <h4>確認結果：{inspect.filename}</h4>
          <p>バックアップJSON: {inspect.has_backup_json ? 'あり' : 'なし'} / DB: {inspect.has_db ? 'あり' : 'なし'} / 写真: {inspect.uploads_count}件</p>
          <p>バックアップ版: {inspect.version || '-'} / 作成日時: {inspect.created_at || '-'}</p>
          <div className="restore-warning">
            <strong>復元前確認</strong>
            <p>復元を実行すると現在のDBと写真は安全バックアップ後に置き換えられます。復元後はUbuntu側で再起動してください。</p>
            <label><input type="checkbox" checked={restoreConfirmed} onChange={e=>setRestoreConfirmed(e.target.checked)} /> 内容を確認し、復元を実行する</label>
          </div>
          <table className="table"><thead><tr><th>テーブル</th><th>件数</th></tr></thead><tbody>{Object.entries(inspect.table_counts).map(([k,v])=><tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table>
        </div>}
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
    </>
  );
}
