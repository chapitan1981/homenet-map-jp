import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';
import { DEVICE_ICONS, getDeviceIcon } from '../types/icon';
import { DEVICE_TEMPLATES } from '../types/templates';

type Part = { id:number; device_id:number; part_type:string; vendor:string; model:string; spec:string; quantity:number; note:string };
type Nic = { id:number; device_id:number; interface_name:string; ip_address:string; mac_address:string; network_type:string; is_primary:boolean; last_seen_at:string };
type Tag = { id:number; device_id:number; tag_name:string };
type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type CustomField = { id:number; device_id:number; field_name:string; field_type:string; field_value:string; sort_order:number; note:string };
type DeviceUrl = { id:number; device_id:number; name:string; url:string; url_type:string; note:string; sort_order:number };

const emptyPart = { part_type:'CPU', vendor:'', model:'', spec:'', quantity:1, note:'' };
const emptyNic = { interface_name:'eth0', ip_address:'', mac_address:'', network_type:'LAN', is_primary:true, last_seen_at:'' };
const emptyField = { field_name:'', field_type:'text', field_value:'', sort_order:0, note:'' };
const emptyUrl = { name:'', url:'', url_type:'WebUI', note:'', sort_order:0 };

export default function DeviceDetailPage() {
  const deviceId = Number(useParams().id);
  const openEditOnLoad = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('edit') === '1';
  const [mode,setMode]=useState<'view'|'edit'>(openEditOnLoad ? 'edit' : 'view');
  const [device,setDevice]=useState<Device|null>(null);
  const [deviceForm,setDeviceForm]=useState<any>(null);
  const [parts,setParts]=useState<Part[]>([]);
  const [interfaces,setInterfaces]=useState<Nic[]>([]);
  const [tags,setTags]=useState<Tag[]>([]);
  const [photos,setPhotos]=useState<DevicePhoto[]>([]);
  const [customFields,setCustomFields]=useState<CustomField[]>([]);
  const [deviceUrls,setDeviceUrls]=useState<DeviceUrl[]>([]);
  const [partForm,setPartForm]=useState(emptyPart);
  const [nicForm,setNicForm]=useState(emptyNic);
  const [fieldForm,setFieldForm]=useState<any>(emptyField);
  const [urlForm,setUrlForm]=useState<any>(emptyUrl);
  const [editingPartId,setEditingPartId]=useState<number|null>(null);
  const [editingNicId,setEditingNicId]=useState<number|null>(null);
  const [editingFieldId,setEditingFieldId]=useState<number|null>(null);
  const [editingUrlId,setEditingUrlId]=useState<number|null>(null);
  const [tagName,setTagName]=useState('');
  const [photoFile,setPhotoFile]=useState<File|null>(null);
  const [photoType,setPhotoType]=useState('front');
  const [photoUploading,setPhotoUploading]=useState(false);
  const [message,setMessage]=useState('');
  const [selectedTemplateId,setSelectedTemplateId]=useState('');
  const [applyingTemplate,setApplyingTemplate]=useState(false);

  const load=async()=>{
    const [d,p,n,t,ph,cf,urls]=await Promise.all([
      api.get(`/devices/${deviceId}`), api.get(`/devices/${deviceId}/parts`), api.get(`/devices/${deviceId}/interfaces`),
      api.get(`/devices/${deviceId}/tags`), api.get(`/devices/${deviceId}/photos`), api.get(`/devices/${deviceId}/custom-fields`),
      api.get(`/devices/${deviceId}/urls`)
    ]);
    setDevice(d.data); setDeviceForm(d.data); setParts(p.data); setInterfaces(n.data); setTags(t.data); setPhotos(ph.data); setCustomFields(cf.data);
    setDeviceUrls(urls.data);
  };
  useEffect(()=>{ if(deviceId) load(); },[deviceId]);

  const clearEditQuery=()=>{ if(typeof window !== 'undefined' && window.location.search.includes('edit=1')) window.history.replaceState({}, '', window.location.pathname); };
  const startEdit=()=>{ setMode('edit'); setMessage(''); if(device) setDeviceForm(device); };
  const cancelEdit=()=>{ setMode('view'); setMessage(''); if(device) setDeviceForm(device); clearEditQuery(); };
  const saveDevice=async()=>{ await api.put(`/devices/${deviceId}`, deviceForm); await load(); setMode('view'); clearEditQuery(); };
  const addTag=async()=>{ if(!tagName.trim()) return; await api.post(`/devices/${deviceId}/tags`,{tag_name:tagName.trim()}); setTagName(''); await load(); };
  const deleteTag=async(id:number)=>{ await api.delete(`/tags/${id}`); await load(); };
  const savePart=async()=>{ editingPartId ? await api.put(`/parts/${editingPartId}`, partForm) : await api.post(`/devices/${deviceId}/parts`, partForm); setEditingPartId(null); setPartForm(emptyPart); await load(); };
  const editPart=(p:Part)=>{ setEditingPartId(p.id); setPartForm({part_type:p.part_type,vendor:p.vendor||'',model:p.model||'',spec:p.spec||'',quantity:p.quantity||1,note:p.note||''}); };
  const deletePart=async(id:number)=>{ if(!confirm('このパーツを削除しますか？')) return; await api.delete(`/parts/${id}`); await load(); };
  const saveNic=async()=>{ editingNicId ? await api.put(`/interfaces/${editingNicId}`, nicForm) : await api.post(`/devices/${deviceId}/interfaces`, nicForm); setEditingNicId(null); setNicForm(emptyNic); await load(); };
  const editNic=(n:Nic)=>{ setEditingNicId(n.id); setNicForm({interface_name:n.interface_name||'',ip_address:n.ip_address||'',mac_address:n.mac_address||'',network_type:n.network_type||'LAN',is_primary:!!n.is_primary,last_seen_at:n.last_seen_at||''}); };
  const deleteNic=async(id:number)=>{ if(!confirm('このネットワーク情報を削除しますか？')) return; await api.delete(`/interfaces/${id}`); await load(); };
  const saveField=async()=>{ if(!fieldForm.field_name.trim()){ setMessage('カスタム項目名を入力してください。'); return; } editingFieldId ? await api.put(`/custom-fields/${editingFieldId}`, fieldForm) : await api.post(`/devices/${deviceId}/custom-fields`, fieldForm); setEditingFieldId(null); setFieldForm(emptyField); setMessage('カスタム項目を保存しました。'); await load(); };
  const editField=(f:CustomField)=>{ setEditingFieldId(f.id); setFieldForm({field_name:f.field_name||'',field_type:f.field_type||'text',field_value:f.field_value||'',sort_order:f.sort_order||0,note:f.note||''}); };
  const deleteField=async(id:number)=>{ if(!confirm('このカスタム項目を削除しますか？')) return; await api.delete(`/custom-fields/${id}`); await load(); };

  const saveUrl=async()=>{
    setMessage('');
    if(!urlForm.name.trim() || !urlForm.url.trim()){
      setMessage('URL名とURLを入力してください。');
      return;
    }
    const payload = {...urlForm, sort_order:Number(urlForm.sort_order||0)};
    editingUrlId ? await api.put(`/device-urls/${editingUrlId}`, payload) : await api.post(`/devices/${deviceId}/urls`, payload);
    setEditingUrlId(null);
    setUrlForm(emptyUrl);
    setMessage('URL情報を保存しました。');
    await load();
  };

  const editUrl=(u:DeviceUrl)=>{
    setEditingUrlId(u.id);
    setUrlForm({name:u.name||'',url:u.url||'',url_type:u.url_type||'WebUI',note:u.note||'',sort_order:u.sort_order||0});
  };

  const deleteUrl=async(id:number)=>{
    if(!confirm('このURLを削除しますか？')) return;
    await api.delete(`/device-urls/${id}`);
    await load();
  };

  const setUrlPreset=(name:string, url_type:string)=>{
    setEditingUrlId(null);
    setUrlForm({...emptyUrl,name,url_type});
    setMessage(`「${name}」を入力欄へセットしました。URLを入力して保存してください。`);
  };

  const uploadPhoto=async()=>{ setMessage(''); if(!photoFile){ setMessage('写真ファイルを選択してください。'); return; } try{ setPhotoUploading(true); setMessage('アップロード中...'); const fd=new FormData(); fd.append('file',photoFile); fd.append('photo_type',photoType); fd.append('note',''); await api.post(`/devices/${deviceId}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}}); setPhotoFile(null); await load(); setMessage('アップロード完了'); }catch(err:any){ setMessage(`アップロード失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`); }finally{ setPhotoUploading(false); } };

  const applyDeviceTemplate=async()=>{
    setMessage('');
    const template = DEVICE_TEMPLATES.find(t=>t.id===selectedTemplateId);
    if(!template){
      setMessage('テンプレートを選択してください。');
      return;
    }
    if(!confirm(`テンプレート「${template.label}」のカスタム項目を追加しますか？既存項目は残ります。`)) return;
    try{
      setApplyingTemplate(true);
      const existingNames = new Set(customFields.map(f=>f.field_name));
      let added = 0;
      for(const field of template.fields){
        if(existingNames.has(field.field_name)) continue;
        await api.post(`/devices/${deviceId}/custom-fields`, field);
        added++;
      }
      const nextForm = {...deviceForm, device_type: template.device_type, icon: template.icon};
      setDeviceForm(nextForm);
      await api.put(`/devices/${deviceId}`, nextForm);
      await load();
      setMessage(`テンプレート「${template.label}」を適用しました。追加項目: ${added}件`);
    }catch(err:any){
      setMessage(`テンプレート適用失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setApplyingTemplate(false);
    }
  };

  const renderCustomValue=(f:CustomField)=> f.field_type==='url'&&f.field_value ? <a className="text-link" href={f.field_value} target="_blank" rel="noreferrer">{f.field_value}</a> : f.field_type==='textarea' ? <span className="multiline-value">{f.field_value}</span> : <span>{f.field_value}</span>;

  if(!device||!deviceForm) return <><h2>機器詳細</h2><div className="card">読み込み中...</div></>;
  const icon=getDeviceIcon(device.icon, device.device_type);

  if(mode==='edit'){
    return <>
      <div className="page-title-row"><h2>機器統合編集：{device.name}</h2><div><button onClick={saveDevice}>基本情報を保存して戻る</button><button className="secondary-button" onClick={cancelEdit}>キャンセル</button></div></div>
      <div className="edit-mode-banner">統合編集画面：基本情報・タグ・カスタム項目・写真・パーツ・ネットワーク情報をこの画面で編集できます。</div>
      {message && <div className={message.includes('失敗')||message.includes('選択')||message.includes('入力')?'status-message error':'status-message'}>{message}</div>}
      
      <div className="card template-card">
        <h3>ホームラボ特化テンプレート</h3>
        <p className="photo-hint">PC / NAS / VM / Docker / ネットワーク機器向けのカスタム項目をまとめて追加します。既存項目は残し、同名項目は重複追加しません。</p>
        <div className="inline-form">
          <select value={selectedTemplateId} onChange={e=>setSelectedTemplateId(e.target.value)}>
            <option value="">テンプレートを選択</option>
            {DEVICE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <button onClick={applyDeviceTemplate} disabled={applyingTemplate}>{applyingTemplate?'適用中...':'テンプレート適用'}</button>
        </div>
        <div className="template-list">
          {DEVICE_TEMPLATES.map(t=><div className="template-mini-card" key={t.id}><strong>{t.label}</strong><p>{t.description}</p><span>{t.fields.length}項目</span></div>)}
        </div>
      </div>

      <div className="grid"><div className="card form"><h3>基本情報</h3><input placeholder="機器名" value={deviceForm.name||''} onChange={e=>setDeviceForm({...deviceForm,name:e.target.value})}/><select value={deviceForm.device_type||'pc'} onChange={e=>setDeviceForm({...deviceForm,device_type:e.target.value})}><option value="pc">PC</option><option value="server">サーバー</option><option value="nas">NAS</option><option value="network">ネットワーク機器</option><option value="iot">IoT</option><option value="vm">仮想マシン</option><option value="container">Dockerコンテナ</option></select><select value={deviceForm.icon||''} onChange={e=>setDeviceForm({...deviceForm,icon:e.target.value})}>{DEVICE_ICONS.map(i=><option key={i.value} value={i.value}>{i.mark} {i.label}</option>)}</select><input placeholder="メーカー" value={deviceForm.vendor||''} onChange={e=>setDeviceForm({...deviceForm,vendor:e.target.value})}/><input placeholder="型番" value={deviceForm.model||''} onChange={e=>setDeviceForm({...deviceForm,model:e.target.value})}/><input placeholder="OS" value={deviceForm.os_name||''} onChange={e=>setDeviceForm({...deviceForm,os_name:e.target.value})}/><textarea placeholder="説明" value={deviceForm.description||''} onChange={e=>setDeviceForm({...deviceForm,description:e.target.value})}/><button onClick={saveDevice}>基本情報を保存</button></div><div className="card"><h3>タグ</h3><div className="tag-list">{tags.map(t=><span className="tag" key={t.id}>{t.tag_name} <button className="tag-delete" onClick={()=>deleteTag(t.id)}>×</button></span>)}</div><div className="inline-form"><input placeholder="タグ" value={tagName} onChange={e=>setTagName(e.target.value)}/><button onClick={addTag}>追加</button></div></div></div>

      <div className="card"><h3>URL管理</h3>
        <div className="preset-field-box"><strong>よく使うURL</strong><div className="preset-field-list">
          <button className="preset-button" onClick={()=>setUrlPreset('管理URL','WebUI')}>管理URL</button>
          <button className="preset-button" onClick={()=>setUrlPreset('Tailscale URL','Tailscale')}>Tailscale URL</button>
          <button className="preset-button" onClick={()=>setUrlPreset('SSH','SSH')}>SSH</button>
          <button className="preset-button" onClick={()=>setUrlPreset('RDP','RDP')}>RDP</button>
          <button className="preset-button" onClick={()=>setUrlPreset('Homepage','WebUI')}>Homepage</button>
          <button className="preset-button" onClick={()=>setUrlPreset('TrueNAS','WebUI')}>TrueNAS</button>
          <button className="preset-button" onClick={()=>setUrlPreset('Proxmox','WebUI')}>Proxmox</button>
          <button className="preset-button" onClick={()=>setUrlPreset('Jellyfin','WebUI')}>Jellyfin</button>
          <button className="preset-button" onClick={()=>setUrlPreset('KonomiTV','WebUI')}>KonomiTV</button>
        </div></div>
        <div className="inline-form">
          <input placeholder="名称" value={urlForm.name} onChange={e=>setUrlForm({...urlForm,name:e.target.value})}/>
          <select value={urlForm.url_type} onChange={e=>setUrlForm({...urlForm,url_type:e.target.value})}><option value="WebUI">WebUI</option><option value="Tailscale">Tailscale</option><option value="SSH">SSH</option><option value="RDP">RDP</option><option value="SMB">SMB</option><option value="API">API</option><option value="Other">その他</option></select>
          <input placeholder="URL / 接続文字列" value={urlForm.url} onChange={e=>setUrlForm({...urlForm,url:e.target.value})}/>
          <input type="number" placeholder="並び順" value={urlForm.sort_order} onChange={e=>setUrlForm({...urlForm,sort_order:Number(e.target.value)})}/>
          <input placeholder="メモ" value={urlForm.note} onChange={e=>setUrlForm({...urlForm,note:e.target.value})}/>
          <button onClick={saveUrl}>{editingUrlId?'保存':'URL追加'}</button>
          {editingUrlId&&<button className="secondary-button" onClick={()=>{setEditingUrlId(null);setUrlForm(emptyUrl)}}>キャンセル</button>}
        </div>
        <table className="table"><thead><tr><th>名称</th><th>種別</th><th>URL</th><th>メモ</th><th>操作</th></tr></thead><tbody>{deviceUrls.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.url_type}</td><td><a className="url-button" href={u.url} target="_blank" rel="noreferrer">開く：{u.url}</a></td><td>{u.note}</td><td><button className="small-button" onClick={()=>editUrl(u)}>編集</button><button className="danger-button" onClick={()=>deleteUrl(u.id)}>削除</button></td></tr>)}{deviceUrls.length===0&&<tr><td colSpan={5}>URL未登録</td></tr>}</tbody></table>
      </div>

  
    <div className="card"><h3>登録URL</h3><div className="url-card-list">{deviceUrls.map(u=><a className="device-url-card" key={u.id} href={u.url} target="_blank" rel="noreferrer"><strong>{u.name}</strong><span>{u.url_type}</span><small>{u.url}</small></a>)}{deviceUrls.length===0&&<p className="photo-hint">URL未登録</p>}</div></div>

    <div className="card"><h3>カスタム項目</h3><div className="inline-form"><input placeholder="項目名" value={fieldForm.field_name} onChange={e=>setFieldForm({...fieldForm,field_name:e.target.value})}/><select value={fieldForm.field_type} onChange={e=>setFieldForm({...fieldForm,field_type:e.target.value})}><option value="text">文字列</option><option value="textarea">複数行</option><option value="url">URL</option><option value="date">日付</option><option value="number">数値</option></select>{fieldForm.field_type==='textarea'?<textarea placeholder="値" value={fieldForm.field_value} onChange={e=>setFieldForm({...fieldForm,field_value:e.target.value})}/>:<input type={fieldForm.field_type==='date'?'date':fieldForm.field_type==='number'?'number':'text'} placeholder="値" value={fieldForm.field_value} onChange={e=>setFieldForm({...fieldForm,field_value:e.target.value})}/>}<input type="number" placeholder="並び順" value={fieldForm.sort_order} onChange={e=>setFieldForm({...fieldForm,sort_order:Number(e.target.value)})}/><button onClick={saveField}>{editingFieldId?'保存':'項目追加'}</button>{editingFieldId&&<button className="secondary-button" onClick={()=>{setEditingFieldId(null);setFieldForm(emptyField)}}>キャンセル</button>}</div><table className="table"><thead><tr><th>並び順</th><th>項目名</th><th>タイプ</th><th>値</th><th>操作</th></tr></thead><tbody>{customFields.map(f=><tr key={f.id}><td>{f.sort_order}</td><td>{f.field_name}</td><td>{f.field_type}</td><td>{renderCustomValue(f)}</td><td><button className="small-button" onClick={()=>editField(f)}>編集</button><button className="danger-button" onClick={()=>deleteField(f.id)}>削除</button></td></tr>)}{customFields.length===0&&<tr><td colSpan={4}>カスタム項目未登録</td></tr>}</tbody></table></div>
      <div className="card"><h3>機器写真</h3><div className="inline-form"><select value={photoType} onChange={e=>setPhotoType(e.target.value)}><option value="front">正面</option><option value="back">背面</option><option value="inside">内部</option><option value="other">その他</option></select><input type="file" accept="image/*" onChange={e=>setPhotoFile(e.target.files?.[0]||null)}/><button onClick={uploadPhoto} disabled={photoUploading}>{photoUploading?'アップロード中...':'写真追加'}</button></div><div className="photo-grid">{photos.map(p=><div className="photo-card" key={p.id}><a className="photo-thumb-link" href={p.file_path} target="_blank" rel="noreferrer"><img className="photo-thumb" src={p.file_path}/></a><p>{p.photo_type} / {p.file_name}</p><div className="photo-actions"><a className="photo-open-link" href={p.file_path} target="_blank" rel="noreferrer">開く</a><button className="danger-button" onClick={async()=>{await api.delete(`/device-photos/${p.id}`);load();}}>削除</button></div></div>)}</div></div>
      <div className="card"><h3>パーツ</h3><div className="inline-form"><select value={partForm.part_type} onChange={e=>setPartForm({...partForm,part_type:e.target.value})}><option value="CPU">CPU</option><option value="Memory">メモリ</option><option value="GPU">GPU</option><option value="Motherboard">マザーボード</option><option value="SSD">SSD</option><option value="HDD">HDD</option><option value="PowerSupply">電源</option><option value="Other">その他</option></select><input placeholder="メーカー" value={partForm.vendor} onChange={e=>setPartForm({...partForm,vendor:e.target.value})}/><input placeholder="型番" value={partForm.model} onChange={e=>setPartForm({...partForm,model:e.target.value})}/><input placeholder="仕様" value={partForm.spec} onChange={e=>setPartForm({...partForm,spec:e.target.value})}/><input type="number" min="1" value={partForm.quantity} onChange={e=>setPartForm({...partForm,quantity:Number(e.target.value)})}/><input placeholder="メモ" value={partForm.note} onChange={e=>setPartForm({...partForm,note:e.target.value})}/><button onClick={savePart}>{editingPartId?'保存':'追加'}</button>{editingPartId&&<button className="secondary-button" onClick={()=>{setEditingPartId(null);setPartForm(emptyPart)}}>キャンセル</button>}</div><table className="table"><thead><tr><th>種別</th><th>メーカー</th><th>型番</th><th>仕様</th><th>数量</th><th>操作</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.part_type}</td><td>{p.vendor}</td><td>{p.model}</td><td>{p.spec}</td><td>{p.quantity}</td><td><button className="small-button" onClick={()=>editPart(p)}>編集</button><button className="danger-button" onClick={()=>deletePart(p.id)}>削除</button></td></tr>)}</tbody></table></div>
      <div className="card"><h3>ネットワーク情報</h3><div className="inline-form"><input placeholder="IF名" value={nicForm.interface_name} onChange={e=>setNicForm({...nicForm,interface_name:e.target.value})}/><input placeholder="IP" value={nicForm.ip_address} onChange={e=>setNicForm({...nicForm,ip_address:e.target.value})}/><input placeholder="MAC" value={nicForm.mac_address} onChange={e=>setNicForm({...nicForm,mac_address:e.target.value})}/><select value={nicForm.network_type} onChange={e=>setNicForm({...nicForm,network_type:e.target.value})}><option value="LAN">LAN</option><option value="Wi-Fi">Wi-Fi</option><option value="Tailscale">Tailscale</option><option value="VPN">VPN</option></select><button onClick={saveNic}>{editingNicId?'保存':'追加'}</button>{editingNicId&&<button className="secondary-button" onClick={()=>{setEditingNicId(null);setNicForm(emptyNic)}}>キャンセル</button>}</div><table className="table"><thead><tr><th>IF名</th><th>IP</th><th>MAC</th><th>種別</th><th>操作</th></tr></thead><tbody>{interfaces.map(n=><tr key={n.id}><td>{n.interface_name}</td><td>{n.ip_address}</td><td>{n.mac_address}</td><td>{n.network_type}</td><td><button className="small-button" onClick={()=>editNic(n)}>編集</button><button className="danger-button" onClick={()=>deleteNic(n.id)}>削除</button></td></tr>)}</tbody></table></div>
    </>;
  }

  return <>
    <div className="page-title-row"><h2>機器詳細：{icon.mark} {device.name}</h2><div><button onClick={startEdit}>編集・写真追加</button><Link className="small-button" to="/devices">機器一覧へ戻る</Link></div></div>
    <div className="grid"><div className="card"><h3>基本情報</h3><dl className="detail-list"><dt>アイコン</dt><dd>{icon.mark} {icon.label}</dd><dt>名前</dt><dd>{device.name}</dd><dt>種別</dt><dd>{device.device_type}</dd><dt>メーカー</dt><dd>{device.vendor||'-'}</dd><dt>型番</dt><dd>{device.model||'-'}</dd><dt>OS</dt><dd>{device.os_name||'-'}</dd><dt>説明</dt><dd>{device.description||'-'}</dd></dl></div><div className="card"><h3>タグ</h3><div className="tag-list">{tags.map(t=><span className="tag" key={t.id}>{t.tag_name}</span>)}</div></div></div>
    <div className="card"><h3>カスタム項目</h3><table className="table"><thead><tr><th>並び順</th><th>項目名</th><th>タイプ</th><th>値</th></tr></thead><tbody>{customFields.map(f=><tr key={f.id}><td>{f.sort_order}</td><td>{f.field_name}</td><td>{f.field_type}</td><td>{renderCustomValue(f)}</td></tr>)}{customFields.length===0&&<tr><td colSpan={4}>カスタム項目未登録</td></tr>}</tbody></table></div>
    <div className="card"><h3>機器写真</h3><div className="photo-grid">{photos.map(p=><div className="photo-card" key={p.id}><a className="photo-thumb-link" href={p.file_path} target="_blank" rel="noreferrer"><img className="photo-thumb" src={p.file_path}/></a><p>{p.photo_type} / {p.file_name}</p></div>)}</div></div>
    <div className="card"><h3>パーツ</h3><table className="table"><thead><tr><th>種別</th><th>メーカー</th><th>型番</th><th>仕様</th><th>数量</th><th>メモ</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.part_type}</td><td>{p.vendor}</td><td>{p.model}</td><td>{p.spec}</td><td>{p.quantity}</td><td>{p.note}</td></tr>)}</tbody></table></div>
    <div className="card"><h3>ネットワーク情報</h3><table className="table"><thead><tr><th>IF名</th><th>IP</th><th>MAC</th><th>種別</th></tr></thead><tbody>{interfaces.map(n=><tr key={n.id}><td>{n.interface_name}</td><td>{n.ip_address}</td><td>{n.mac_address}</td><td>{n.network_type}</td></tr>)}</tbody></table></div>
  </>;
}
