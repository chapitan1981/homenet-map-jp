import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';

type RoomPhoto = { id:number; room_id:number; photo_type:string; file_name:string; file_path:string; note:string };
const emptyForm = { name: '', floor: '', description: '', sort_order: 0 };

export default function RoomsPage() {
  const [rooms,setRooms]=useState<Room[]>([]);
  const [form,setForm]=useState(emptyForm);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [selectedRoom,setSelectedRoom]=useState<Room|null>(null);
  const [photos,setPhotos]=useState<RoomPhoto[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');

  const load=async()=>setRooms((await api.get('/rooms')).data);
  const loadPhotos=async(r:Room)=>setPhotos((await api.get(`/rooms/${r.id}/photos`)).data);
  useEffect(()=>{load()},[]);

  const reset=()=>{setEditingId(null);setForm(emptyForm)};
  const submit=async()=>{if(!form.name)return; editingId?await api.put(`/rooms/${editingId}`,form):await api.post('/rooms',form); reset(); load();};
  const edit=(r:Room)=>{setEditingId(r.id);setForm({name:r.name,floor:r.floor||'',description:r.description||'',sort_order:r.sort_order||0})};

  const upload=async()=>{
    console.log('[HomeNet Map JP] room photo upload clicked', { selectedRoom, file });
    setMessage('');
    if(!selectedRoom){
      setMessage('部屋が選択されていません。先に一覧の「写真」を押してください。');
      return;
    }
    if(!file){
      setMessage('写真ファイルを選択してください。');
      return;
    }
    try{
      setUploading(true);
      setMessage('アップロード中...');
      const fd=new FormData();
      fd.append('file',file);
      fd.append('photo_type','background');
      fd.append('note','部屋背景画像');
      const res=await api.post(`/rooms/${selectedRoom.id}/photos`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      console.log('[HomeNet Map JP] room photo upload success', res.data);
      setFile(null);
      await loadPhotos(selectedRoom);
      setMessage('アップロード完了');
    }catch(err:any){
      console.error('[HomeNet Map JP] room photo upload failed', err);
      setMessage(`アップロード失敗: ${err?.response?.data?.detail || err?.message || 'unknown error'}`);
    }finally{
      setUploading(false);
    }
  };

  return <>
    <h2>部屋管理</h2>
    <div className="card form">
      <h3>{editingId?'部屋を編集':'部屋を追加'}</h3>
      <input placeholder="部屋名" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input placeholder="階層" value={form.floor} onChange={e=>setForm({...form,floor:e.target.value})}/>
      <textarea placeholder="説明" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
      <div><button onClick={submit}>{editingId?'保存':'部屋を追加'}</button>{editingId&&<button className="secondary-button" onClick={reset}>キャンセル</button>}</div>
    </div>

    <div className="card">
      <table className="table">
        <thead><tr><th>ID</th><th>部屋名</th><th>階層</th><th>説明</th><th>操作</th></tr></thead>
        <tbody>{rooms.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.floor}</td><td>{r.description}</td><td><button className="small-button" onClick={()=>edit(r)}>編集</button><button className="small-button" onClick={()=>{setSelectedRoom(r);setMessage('');loadPhotos(r)}}>写真</button><button className="danger-button" onClick={async()=>{if(confirm('削除しますか？')){await api.delete(`/rooms/${r.id}`);load();}}}>削除</button></td></tr>)}</tbody>
      </table>
    </div>

    {selectedRoom&&<div className="card">
      <h3>部屋写真：{selectedRoom.name}</h3>
      <div className="inline-form">
        <input type="file" accept="image/*" onChange={e=>{setFile(e.target.files?.[0]||null);setMessage('')}}/>
        <button onClick={upload} disabled={uploading}>{uploading?'アップロード中...':'背景画像を追加'}</button>
      </div>
      {message && <div className={message.includes('失敗') || message.includes('選択') ? 'status-message error' : 'status-message'}>{message}</div>}
      <p className="photo-hint">写真は小さめサムネイルでクロップ表示します。クリックすると原寸画像を別タブで開きます。</p>
      <div className="photo-grid">{photos.map(p=><div className="photo-card" key={p.id}><a className="photo-thumb-link" href={p.file_path} target="_blank" rel="noreferrer"><img className="photo-thumb" src={p.file_path}/></a><p>{p.file_name}</p><div className="photo-actions"><a className="photo-open-link" href={p.file_path} target="_blank" rel="noreferrer">開く</a><button className="danger-button" onClick={async()=>{await api.delete(`/room-photos/${p.id}`);loadPhotos(selectedRoom)}}>削除</button></div></div>)}</div>
    </div>}
  </>;
}
