import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';
import { Device } from '../types/device';

type Rack = { id:number; name:string; room_id?:number; total_units:number; description:string };
type RackItem = { id:number; rack_id:number; device_id?:number; label:string; start_unit:number; unit_size:number; note:string };

export default function RackPage() {
  const [racks,setRacks]=useState<Rack[]>([]);
  const [rooms,setRooms]=useState<Room[]>([]);
  const [devices,setDevices]=useState<Device[]>([]);
  const [selected,setSelected]=useState<Rack|null>(null);
  const [items,setItems]=useState<RackItem[]>([]);
  const [rackForm,setRackForm]=useState<any>({name:'',room_id:'',total_units:12,description:''});
  const [itemForm,setItemForm]=useState<any>({device_id:'',label:'',start_unit:1,unit_size:1,note:''});

  const load=async()=>{
    const [r,rs,ds]=await Promise.all([api.get('/racks'),api.get('/rooms'),api.get('/devices')]);
    setRacks(r.data); setRooms(rs.data); setDevices(ds.data);
    if(!selected && r.data.length) setSelected(r.data[0]);
  };
  const loadItems=async(r:Rack)=>setItems((await api.get(`/racks/${r.id}/items`)).data);
  useEffect(()=>{load()},[]);
  useEffect(()=>{if(selected)loadItems(selected)},[selected?.id]);

  const addRack=async()=>{if(!rackForm.name)return; await api.post('/racks',{...rackForm,room_id:rackForm.room_id?Number(rackForm.room_id):null}); setRackForm({name:'',room_id:'',total_units:12,description:''}); load();};
  const addItem=async()=>{if(!selected)return; await api.post(`/racks/${selected.id}/items`,{...itemForm,device_id:itemForm.device_id?Number(itemForm.device_id):null}); setItemForm({device_id:'',label:'',start_unit:1,unit_size:1,note:''}); loadItems(selected);};
  const devName=(id?:number)=>devices.find(d=>d.id===id)?.name||'';

  return <>
    <h2>ラックビュー</h2>
    <div className="grid">
      <div className="card form"><h3>ラック追加</h3><input placeholder="ラック名" value={rackForm.name} onChange={e=>setRackForm({...rackForm,name:e.target.value})}/><select value={rackForm.room_id} onChange={e=>setRackForm({...rackForm,room_id:e.target.value})}><option value="">部屋未設定</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input type="number" min="1" max="48" value={rackForm.total_units} onChange={e=>setRackForm({...rackForm,total_units:Number(e.target.value)})}/><textarea placeholder="説明" value={rackForm.description} onChange={e=>setRackForm({...rackForm,description:e.target.value})}/><button onClick={addRack}>追加</button></div>
      <div className="card"><h3>ラック一覧</h3>{racks.map(r=><button key={r.id} className={selected?.id===r.id?'primary-tab':'small-button'} onClick={()=>setSelected(r)}>{r.name}</button>)}</div>
    </div>
    {selected && <div className="card"><h3>{selected.name}</h3><div className="inline-form"><select value={itemForm.device_id} onChange={e=>setItemForm({...itemForm,device_id:e.target.value,label:e.target.value?devName(Number(e.target.value)):itemForm.label})}><option value="">機器未選択</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><input placeholder="表示名" value={itemForm.label} onChange={e=>setItemForm({...itemForm,label:e.target.value})}/><input type="number" min="1" max={selected.total_units} value={itemForm.start_unit} onChange={e=>setItemForm({...itemForm,start_unit:Number(e.target.value)})}/><input type="number" min="1" max={selected.total_units} value={itemForm.unit_size} onChange={e=>setItemForm({...itemForm,unit_size:Number(e.target.value)})}/><input placeholder="メモ" value={itemForm.note} onChange={e=>setItemForm({...itemForm,note:e.target.value})}/><button onClick={addItem}>追加</button></div><div className="rack-view">{Array.from({length:selected.total_units},(_,i)=>selected.total_units-i).map(u=>{const hit=items.find(it=>u<=it.start_unit&&u>it.start_unit-it.unit_size);return <div key={u} className={hit?'rack-unit occupied':'rack-unit'}><span>U{u}</span><strong>{hit?(hit.label||devName(hit.device_id)):''}</strong>{hit&&u===hit.start_unit&&<button onClick={async()=>{await api.delete(`/racks/items/${hit.id}`);loadItems(selected)}}>×</button>}</div>})}</div></div>}
  </>;
}
