import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';

type RoomPhoto = { id:number; room_id:number; photo_type:string; file_name:string; file_path:string; note:string };
const emptyForm = { name: '', floor: '', description: '', sort_order: 0 };

export default function RoomsPage() {
  const [rooms,setRooms]=useState<Room[]>([]);
  const [photoMap,setPhotoMap]=useState<Record<number, RoomPhoto | null>>({});
  const [mode,setMode]=useState<'view'|'edit'|'create'>('view');
  const [selectedRoom,setSelectedRoom]=useState<Room|null>(null);
  const [form,setForm]=useState(emptyForm);
  const [photos,setPhotos]=useState<RoomPhoto[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');

  const load=async()=>{
    const res = await api.get('/rooms');
    setRooms(res.data);
    const entries = await Promise.all(res.data.map(async (r: Room) => {
      try {
        const ph = await api.get(`/rooms/${r.id}/photos`);
        return [r.id, ph.data?.[0] || null] as const;
      } catch {
        return [r.id, null] as const;
      }
    }));
    setPhotoMap(Object.fromEntries(entries));
  };

  const loadPhotos=async(r:Room)=>{
    const res = await api.get(`/rooms/${r.id}/photos`);
    setPhotos(res.data);
  };

  useEffect(()=>{load()},[]);

  const openCreate=()=>{ setMode('create'); setSelectedRoom(null); setForm(emptyForm); setPhotos([]); setMessage(''); };
  const openEdit=(r:Room)=>{ setMode('edit'); setSelectedRoom(r); setForm({name:r.name || '', floor:r.floor || '', description:r.description || '', sort_order:r.sort_order || 0}); loadPhotos(r); setMessage(''); };
  const cancelEdit=()=>{ setMode('view'); setSelectedRoom(null); setForm(emptyForm); setPhotos([]); setFile(null); setMessage(''); load(); };

  const saveRoom=async()=>{
    if(!form.name.trim()){ setMessage('部屋名を入力してください。'); return; }
    if(mode==='create'){
      const res = await api.post('/rooms', form);
      await load();
      openEdit(res.data);
      setMessage('部屋を追加しました。写真も追加できます。');
      return;
    }
    if(mode==='edit' && selectedRoom){
      await api.put(`/rooms/${selectedRoom.id}`, form);
      await load();
      setMode('view');
      setMessage('');
    }
  };

  const deleteRoom=async(r:Room)=>{
    if(!confirm(`部屋「${r.name}」を削除しますか？`)) return;
    await api.delete(`/rooms/${r.id}`);
    await load();
  };

  const upload=async()=>{
    setMessage('');
    if(!selectedRoom){ setMessage('写真登録は、部屋を保存してから実行してください。'); return; }
    if(!file){ setMessage('写真ファイルを選択してください。'); return; }
    try{
      setUploading(true); setMessage('アップロード中...');
      const fd=new FormData(); fd.append('file',file); fd.append('photo_type','background'); fd.append('note','部屋背景画像');
      await api.post(`/rooms/${selectedRoom.id}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      setFile(null); await loadPhotos(selectedRoom); await load(); setMessage('アップロード完了');
    }catch(err:any){ setMessage(`アップロード失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`); }
    finally{ setUploading(false); }
  };

  if(mode==='edit' || mode==='create'){
    return <>
      <div className="page-title-row"><h2>{mode==='create' ? '部屋を追加' : `部屋を編集：${selectedRoom?.name || ''}`}</h2><div><button onClick={saveRoom}>保存</button><button className="secondary-button" onClick={cancelEdit}>キャンセル</button></div></div>
      <div className="edit-mode-banner">編集モード：基本情報と写真をこの画面で編集できます。</div>
      <div className="card form"><h3>基本情報</h3><input placeholder="部屋名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="階層 例: 1F / 2F" value={form.floor} onChange={e=>setForm({...form,floor:e.target.value})}/><textarea placeholder="説明" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
      {message && <div className={message.includes('失敗') || message.includes('入力') || message.includes('選択') ? 'status-message error' : 'status-message'}>{message}</div>}
      {selectedRoom && <div className="card"><h3>部屋写真</h3><div className="inline-form"><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setMessage('')}}/><button onClick={upload} disabled={uploading}>{uploading?'アップロード中...':'背景画像を追加'}</button></div><p className="photo-hint">一覧にも視認しやすい縮小版を表示します。</p><div className="photo-grid">{photos.map(p=><div className="photo-card" key={p.id}><a className="photo-thumb-link" href={p.file_path} target="_blank" rel="noreferrer"><img className="photo-thumb" src={p.file_path}/></a><p>{p.file_name}</p><div className="photo-actions"><a className="photo-open-link" href={p.file_path} target="_blank" rel="noreferrer">開く</a><button className="danger-button" onClick={async()=>{await api.delete(`/room-photos/${p.id}`);loadPhotos(selectedRoom);load();}}>削除</button></div></div>)}</div></div>}
    </>;
  }

  return <>
    <div className="page-title-row"><h2>部屋管理</h2><button onClick={openCreate}>部屋を追加</button></div>
    <div className="room-card-grid">
      {rooms.map(r=>{
        const photo = photoMap[r.id];
        return <div className="room-summary-card" key={r.id}>
          <div className="room-summary-photo">{photo ? <img src={photo.file_path}/> : <span>部屋写真なし</span>}</div>
          <div className="summary-body"><h3>{r.name}</h3><p>{r.floor || '-'} / {r.description || '-'}</p><div className="summary-actions"><button className="small-button" onClick={()=>openEdit(r)}>編集・写真追加</button><button className="danger-button" onClick={()=>deleteRoom(r)}>削除</button></div></div>
        </div>
      })}
      {rooms.length===0 && <div className="card">部屋未登録</div>}
    </div>
  </>;
}
