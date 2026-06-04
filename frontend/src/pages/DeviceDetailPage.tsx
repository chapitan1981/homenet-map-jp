import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Device } from '../types/device';
import { DEVICE_ICONS, getDeviceIcon } from '../types/icon';

type Part = { id:number; device_id:number; part_type:string; vendor:string; model:string; spec:string; quantity:number; note:string };
type Nic = { id:number; device_id:number; interface_name:string; ip_address:string; mac_address:string; network_type:string; is_primary:boolean; last_seen_at:string };
type Tag = { id:number; device_id:number; tag_name:string };
type DevicePhoto = { id:number; device_id:number; photo_type:string; file_name:string; file_path:string; note:string };
type CustomField = { id:number; device_id:number; field_name:string; field_type:string; field_value:string; sort_order:number; note:string };

const emptyPart = { part_type:'CPU', vendor:'', model:'', spec:'', quantity:1, note:'' };
const emptyNic = { interface_name:'eth0', ip_address:'', mac_address:'', network_type:'LAN', is_primary:true, last_seen_at:'' };

export default function DeviceDetailPage() {
  const deviceId = Number(useParams().id);
  const [device,setDevice]=useState<Device|null>(null);
  const [deviceForm,setDeviceForm]=useState<any>(null);
  const [editingDevice,setEditingDevice]=useState(false);
  const [parts,setParts]=useState<Part[]>([]);
  const [interfaces,setInterfaces]=useState<Nic[]>([]);
  const [tags,setTags]=useState<Tag[]>([]);
  const [partForm,setPartForm]=useState(emptyPart);
  const [nicForm,setNicForm]=useState(emptyNic);
  const [editingPartId,setEditingPartId]=useState<number|null>(null);
  const [editingNicId,setEditingNicId]=useState<number|null>(null);
  const [tagName,setTagName]=useState('');
  const [photos,setPhotos]=useState<DevicePhoto[]>([]);
  const [photoFile,setPhotoFile]=useState<File|null>(null);
  const [photoType,setPhotoType]=useState('front');
  const [photoUploading,setPhotoUploading]=useState(false);
  const [photoMessage,setPhotoMessage]=useState('');
  const [customFields,setCustomFields]=useState<CustomField[]>([]);
  const [fieldForm,setFieldForm]=useState<any>({field_name:'',field_type:'text',field_value:'',sort_order:0,note:''});
  const [editingFieldId,setEditingFieldId]=useState<number|null>(null);
  const [fieldMessage,setFieldMessage]=useState('');

  const load=async()=>{
    const [d,p,n,t,ph,cf]=await Promise.all([api.get(`/devices/${deviceId}`),api.get(`/devices/${deviceId}/parts`),api.get(`/devices/${deviceId}/interfaces`),api.get(`/devices/${deviceId}/tags`),api.get(`/devices/${deviceId}/photos`),api.get(`/devices/${deviceId}/custom-fields`)]);
    setDevice(d.data); setDeviceForm(d.data); setParts(p.data); setInterfaces(n.data); setTags(t.data); setPhotos(ph.data); setCustomFields(cf.data);
  };
  
  const resetFieldForm=()=>{
    setEditingFieldId(null);
    setFieldForm({field_name:'',field_type:'text',field_value:'',sort_order:0,note:''});
  };

  const saveCustomField=async()=>{
    setFieldMessage('');
    if(!fieldForm.field_name.trim()){
      setFieldMessage('項目名を入力してください。');
      return;
    }
    try{
      if(editingFieldId){
        await api.put(`/custom-fields/${editingFieldId}`, fieldForm);
        setFieldMessage('カスタム項目を更新しました。');
      }else{
        await api.post(`/devices/${deviceId}/custom-fields`, fieldForm);
        setFieldMessage('カスタム項目を追加しました。');
      }
      resetFieldForm();
      await load();
    }catch(err:any){
      setFieldMessage(`保存失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }
  };

  const editCustomField=(f:CustomField)=>{
    setEditingFieldId(f.id);
    setFieldForm({field_name:f.field_name||'',field_type:f.field_type||'text',field_value:f.field_value||'',sort_order:f.sort_order||0,note:f.note||''});
    setFieldMessage('');
  };

  const deleteCustomField=async(id:number)=>{
    if(!confirm('このカスタム項目を削除しますか？')) return;
    await api.delete(`/custom-fields/${id}`);
    await load();
  };

  const renderCustomValue=(f:CustomField)=>{
    if(f.field_type === 'url' && f.field_value){
      return <a className="text-link" href={f.field_value} target="_blank" rel="noreferrer">{f.field_value}</a>;
    }
    if(f.field_type === 'textarea'){
      return <span className="multiline-value">{f.field_value}</span>;
    }
    return <span>{f.field_value}</span>;
  };

  useEffect(()=>{ if(deviceId) load(); },[deviceId]);

  const saveDevice=async()=>{ await api.put(`/devices/${deviceId}`, deviceForm); setEditingDevice(false); load(); };
  const savePart=async()=>{ editingPartId ? await api.put(`/parts/${editingPartId}`, partForm) : await api.post(`/devices/${deviceId}/parts`, partForm); setEditingPartId(null); setPartForm(emptyPart); load(); };
  const saveNic=async()=>{ editingNicId ? await api.put(`/interfaces/${editingNicId}`, nicForm) : await api.post(`/devices/${deviceId}/interfaces`, nicForm); setEditingNicId(null); setNicForm(emptyNic); load(); };
  const addTag=async()=>{ if(!tagName.trim())return; await api.post(`/devices/${deviceId}/tags`,{tag_name:tagName.trim()}); setTagName(''); load(); };
  const uploadPhoto=async()=>{
    console.log('[HomeNet Map JP] device photo upload clicked', { deviceId, photoFile, photoType });
    setPhotoMessage('');
    if(!photoFile){
      setPhotoMessage('写真ファイルを選択してください。');
      return;
    }
    try{
      setPhotoUploading(true);
      setPhotoMessage('アップロード中...');
      const fd=new FormData();
      fd.append('file',photoFile);
      fd.append('photo_type',photoType);
      fd.append('note','');
      const res=await api.post(`/devices/${deviceId}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      console.log('[HomeNet Map JP] device photo upload success', res.data);
      setPhotoFile(null);
      await load();
      setPhotoMessage('アップロード完了');
    }catch(err:any){
      console.error('[HomeNet Map JP] device photo upload failed', err);
      setPhotoMessage(`アップロード失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setPhotoUploading(false);
    }
  };

  if(!device||!deviceForm) return <><h2>機器詳細</h2><div className="card">読み込み中...</div></>;
  const icon=getDeviceIcon(device.icon);

  return <>
    <div className="page-title-row"><h2>機器詳細：{icon.mark} {device.name}</h2><Link className="small-button" to="/devices">機器一覧へ戻る</Link></div>
    <div className="grid">
      <div className="card">
        <div className="section-title-row"><h3>基本情報</h3>{!editingDevice&&<button className="small-button" onClick={()=>setEditingDevice(true)}>編集</button>}</div>
        {editingDevice ? <div className="form">
          <input value={deviceForm.name} onChange={e=>setDeviceForm({...deviceForm,name:e.target.value})}/>
          <select value={deviceForm.device_type} onChange={e=>setDeviceForm({...deviceForm,device_type:e.target.value})}><option value="pc">PC</option><option value="server">サーバー</option><option value="nas">NAS</option><option value="network">ネットワーク機器</option><option value="iot">IoT</option><option value="vm">仮想マシン</option><option value="container">Dockerコンテナ</option></select>
          <select value={deviceForm.icon||''} onChange={e=>setDeviceForm({...deviceForm,icon:e.target.value})}>{DEVICE_ICONS.map(i=><option key={i.value} value={i.value}>{i.mark} {i.label}</option>)}</select>
          <input placeholder="メーカー" value={deviceForm.vendor||''} onChange={e=>setDeviceForm({...deviceForm,vendor:e.target.value})}/>
          <input placeholder="型番" value={deviceForm.model||''} onChange={e=>setDeviceForm({...deviceForm,model:e.target.value})}/>
          <input placeholder="OS" value={deviceForm.os_name||''} onChange={e=>setDeviceForm({...deviceForm,os_name:e.target.value})}/>
          <textarea placeholder="説明" value={deviceForm.description||''} onChange={e=>setDeviceForm({...deviceForm,description:e.target.value})}/>
          <div><button onClick={saveDevice}>保存</button><button className="secondary-button" onClick={()=>{setEditingDevice(false);setDeviceForm(device)}}>キャンセル</button></div>
        </div> : <dl className="detail-list"><dt>アイコン</dt><dd>{icon.mark} {icon.label}</dd><dt>名前</dt><dd>{device.name}</dd><dt>種別</dt><dd>{device.device_type}</dd><dt>メーカー</dt><dd>{device.vendor||'-'}</dd><dt>型番</dt><dd>{device.model||'-'}</dd><dt>OS</dt><dd>{device.os_name||'-'}</dd><dt>説明</dt><dd>{device.description||'-'}</dd></dl>}
      </div>
      <div className="card"><h3>タグ</h3><div className="tag-list">{tags.map(t=><span className="tag" key={t.id}>{t.tag_name}<button onClick={async()=>{await api.delete(`/tags/${t.id}`);load();}}>×</button></span>)}</div><div className="inline-form"><input placeholder="タグ" value={tagName} onChange={e=>setTagName(e.target.value)}/><button onClick={addTag}>追加</button></div></div>
    </div>

    <div className="card"><h3>カスタム項目</h3>
      <div className="inline-form">
        <input placeholder="項目名 例: 購入日 / 保証期限 / Tailscale IP" value={fieldForm.field_name} onChange={e=>setFieldForm({...fieldForm,field_name:e.target.value})}/>
        <select value={fieldForm.field_type} onChange={e=>setFieldForm({...fieldForm,field_type:e.target.value})}>
          <option value="text">文字列</option>
          <option value="textarea">複数行テキスト</option>
          <option value="url">URL</option>
          <option value="date">日付</option>
          <option value="number">数値</option>
        </select>
        {fieldForm.field_type==='textarea'
          ? <textarea placeholder="値" value={fieldForm.field_value} onChange={e=>setFieldForm({...fieldForm,field_value:e.target.value})}/>
          : <input type={fieldForm.field_type==='date'?'date':fieldForm.field_type==='number'?'number':'text'} placeholder="値" value={fieldForm.field_value} onChange={e=>setFieldForm({...fieldForm,field_value:e.target.value})}/>
        }
        <input type="number" placeholder="並び順" value={fieldForm.sort_order} onChange={e=>setFieldForm({...fieldForm,sort_order:Number(e.target.value)})}/>
        <button onClick={saveCustomField}>{editingFieldId?'保存':'項目追加'}</button>
        {editingFieldId&&<button className="secondary-button" onClick={resetFieldForm}>キャンセル</button>}
      </div>
      {fieldMessage&&<div className={fieldMessage.includes('失敗')||fieldMessage.includes('入力')?'status-message error':'status-message'}>{fieldMessage}</div>}
      <table className="table">
        <thead><tr><th>項目名</th><th>タイプ</th><th>値</th><th>並び順</th><th>操作</th></tr></thead>
        <tbody>
          {customFields.map(f=><tr key={f.id}><td>{f.field_name}</td><td>{f.field_type}</td><td>{renderCustomValue(f)}</td><td>{f.sort_order}</td><td><button className="small-button" onClick={()=>editCustomField(f)}>編集</button><button className="danger-button" onClick={()=>deleteCustomField(f.id)}>削除</button></td></tr>)}
          {customFields.length===0&&<tr><td colSpan={5}>カスタム項目未登録</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="card"><h3>機器写真</h3><div className="inline-form"><select value={photoType} onChange={e=>setPhotoType(e.target.value)}><option value="front">正面</option><option value="back">背面</option><option value="inside">内部</option><option value="other">その他</option></select><input type="file" accept="image/*" onChange={e=>{setPhotoFile(e.target.files?.[0]||null);setPhotoMessage('')}}/><button onClick={uploadPhoto} disabled={photoUploading}>{photoUploading?'アップロード中...':'写真追加'}</button></div>{photoMessage && <div className={photoMessage.includes('失敗') || photoMessage.includes('選択') ? 'status-message error' : 'status-message'}>{photoMessage}</div>}<p className="photo-hint">写真は小さめサムネイルでクロップ表示します。クリックすると原寸画像を別タブで開きます。</p><div className="photo-grid">{photos.map(p=><div className="photo-card" key={p.id}><a className="photo-thumb-link" href={p.file_path} target="_blank" rel="noreferrer"><img className="photo-thumb" src={p.file_path}/></a><p>{p.photo_type} / {p.file_name}</p><div className="photo-actions"><a className="photo-open-link" href={p.file_path} target="_blank" rel="noreferrer">開く</a><button className="danger-button" onClick={async()=>{await api.delete(`/device-photos/${p.id}`);load();}}>削除</button></div></div>)}</div></div>
    <div className="card"><h3>{editingPartId?'パーツ編集':'パーツ登録'}</h3><div className="inline-form"><select value={partForm.part_type} onChange={e=>setPartForm({...partForm,part_type:e.target.value})}><option value="CPU">CPU</option><option value="Memory">メモリ</option><option value="GPU">GPU</option><option value="Motherboard">マザーボード</option><option value="SSD">SSD</option><option value="HDD">HDD</option><option value="PowerSupply">電源</option><option value="Other">その他</option></select><input placeholder="メーカー" value={partForm.vendor} onChange={e=>setPartForm({...partForm,vendor:e.target.value})}/><input placeholder="型番" value={partForm.model} onChange={e=>setPartForm({...partForm,model:e.target.value})}/><input placeholder="仕様" value={partForm.spec} onChange={e=>setPartForm({...partForm,spec:e.target.value})}/><input type="number" min="1" value={partForm.quantity} onChange={e=>setPartForm({...partForm,quantity:Number(e.target.value)})}/><input placeholder="メモ" value={partForm.note} onChange={e=>setPartForm({...partForm,note:e.target.value})}/><button onClick={savePart}>{editingPartId?'保存':'追加'}</button>{editingPartId&&<button className="secondary-button" onClick={()=>{setEditingPartId(null);setPartForm(emptyPart)}}>キャンセル</button>}</div><table className="table"><thead><tr><th>種別</th><th>メーカー</th><th>型番</th><th>仕様</th><th>数量</th><th>メモ</th><th>操作</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.part_type}</td><td>{p.vendor}</td><td>{p.model}</td><td>{p.spec}</td><td>{p.quantity}</td><td>{p.note}</td><td><button className="small-button" onClick={()=>{setEditingPartId(p.id);setPartForm({part_type:p.part_type,vendor:p.vendor||'',model:p.model||'',spec:p.spec||'',quantity:p.quantity||1,note:p.note||''})}}>編集</button><button className="danger-button" onClick={async()=>{await api.delete(`/parts/${p.id}`);load();}}>削除</button></td></tr>)}</tbody></table></div>
    <div className="card"><h3>{editingNicId?'ネットワーク情報編集':'ネットワーク情報登録'}</h3><div className="inline-form"><input placeholder="IF名" value={nicForm.interface_name} onChange={e=>setNicForm({...nicForm,interface_name:e.target.value})}/><input placeholder="IP" value={nicForm.ip_address} onChange={e=>setNicForm({...nicForm,ip_address:e.target.value})}/><input placeholder="MAC" value={nicForm.mac_address} onChange={e=>setNicForm({...nicForm,mac_address:e.target.value})}/><select value={nicForm.network_type} onChange={e=>setNicForm({...nicForm,network_type:e.target.value})}><option value="LAN">LAN</option><option value="Wi-Fi">Wi-Fi</option><option value="Tailscale">Tailscale</option><option value="VPN">VPN</option></select><button onClick={saveNic}>{editingNicId?'保存':'追加'}</button>{editingNicId&&<button className="secondary-button" onClick={()=>{setEditingNicId(null);setNicForm(emptyNic)}}>キャンセル</button>}</div><table className="table"><thead><tr><th>IF名</th><th>IP</th><th>MAC</th><th>種別</th><th>操作</th></tr></thead><tbody>{interfaces.map(n=><tr key={n.id}><td>{n.interface_name}</td><td>{n.ip_address}</td><td>{n.mac_address}</td><td>{n.network_type}</td><td><button className="small-button" onClick={()=>{setEditingNicId(n.id);setNicForm({interface_name:n.interface_name||'',ip_address:n.ip_address||'',mac_address:n.mac_address||'',network_type:n.network_type||'LAN',is_primary:!!n.is_primary,last_seen_at:n.last_seen_at||''})}}>編集</button><button className="danger-button" onClick={async()=>{await api.delete(`/interfaces/${n.id}`);load();}}>削除</button></td></tr>)}</tbody></table></div>
  </>;
}
