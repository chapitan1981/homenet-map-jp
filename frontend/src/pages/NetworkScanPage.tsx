import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type ScanResult = {
  ip:string;
  online:boolean;
  ping:boolean;
  open_ports:number[];
  hostname:string;
  registered:boolean;
  suggested_name:string;
};

export default function NetworkScanPage(){
  const [cidr,setCidr]=useState('192.168.0.0/24');
  const [ports,setPorts]=useState('22,80,443,3880,3881');
  const [timeout,setTimeoutMs]=useState(300);
  const [loading,setLoading]=useState(false);
  const [ping,setPing]=useState(true);
  const [message,setMessage]=useState('');
  const [results,setResults]=useState<ScanResult[]>([]);

  const scan=async()=>{
    setLoading(true);
    setMessage('');
    setResults([]);
    try{
      const res=await api.post('/network-scan',{
        cidr,
        tcp_ports:ports,
        timeout_ms:timeout,
        max_hosts:256,
        ping,
      });
      setResults(res.data.results || []);
      setMessage(`スキャン完了: ${res.data.count || 0}件検出`);
    }catch(err:any){
      setMessage(`スキャン失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }finally{
      setLoading(false);
    }
  };

  const addDevice=async(r:ScanResult)=>{
    const name=prompt('機器名を入力してください', r.suggested_name || r.ip);
    if(!name) return;
    try{
      await api.post('/network-scan/add-device',{
        name,
        ip_address:r.ip,
        device_type:'network',
        icon:'network',
        note:`open_ports=${r.open_ports.join(',')}; ping=${r.ping}`,
      });
      setMessage(`${name} を機器管理へ追加しました。`);
      setResults(results.map(x=>x.ip===r.ip?{...x,registered:true,suggested_name:name}:x));
    }catch(err:any){
      setMessage(`追加失敗: ${JSON.stringify(err?.response?.data || err?.message || 'unknown error')}`);
    }
  };

  return <>
    <div className="page-title-row">
      <h2>ネットワークスキャン</h2>
      <div className="page-actions">
        <Link className="small-button" to="/devices">機器管理</Link>
        <Link className="small-button" to="/manual">マニュアル</Link>
      </div>
    </div>

    {message&&<div className={message.includes('失敗')?'status-message error':'status-message'}>{message}</div>}

    <div className="card">
      <h3>指定範囲をスキャン</h3>
      <p className="photo-hint">LAN内の軽量TCP/Ping確認を行います。対象は最大256ホスト、TCPポートは10個以下です。タイムアウトは300〜1000ms程度がおすすめです。</p>
      <div className="device-form-grid">
        <input value={cidr} onChange={e=>setCidr(e.target.value)} placeholder="192.168.0.0/24"/>
        <input value={ports} onChange={e=>setPorts(e.target.value)} placeholder="22,80,443"/>
        <input type="number" value={timeout} onChange={e=>setTimeoutMs(Number(e.target.value))} placeholder="timeout ms"/>
        <label className="checkbox-line"><input type="checkbox" checked={ping} onChange={e=>setPing(e.target.checked)}/> Pingも確認</label>
      </div>
      <div className="device-save-bar">
        <button className="primary-save-button" onClick={scan} disabled={loading}>{loading?'スキャン中...':'スキャン実行'}</button>
      </div>
    </div>

    <div className="card">
      <h3>検出結果</h3>
      <table className="table">
        <thead>
          <tr>
            <th>状態</th>
            <th>IP</th>
            <th>ホスト名</th>
            <th>Ping</th>
            <th>Open Ports</th>
            <th>登録</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r=><tr key={r.ip}>
            <td>{r.online?'オンライン':'-'}</td>
            <td>{r.ip}</td>
            <td>{r.hostname || '-'}</td>
            <td>{r.ping?'OK':'-'}</td>
            <td>{r.open_ports.join(', ') || '-'}</td>
            <td>{r.registered?'登録済み':'未登録'}</td>
            <td>
              {!r.registered && <button className="small-button" onClick={()=>addDevice(r)}>機器管理へ追加</button>}
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
