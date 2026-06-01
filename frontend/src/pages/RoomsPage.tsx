import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ name: '', floor: '', description: '', sort_order: 0 });

  const load = async () => {
    const res = await api.get('/rooms');
    setRooms(res.data);
  };

  const submit = async () => {
    if (!form.name) return;
    await api.post('/rooms', form);
    setForm({ name: '', floor: '', description: '', sort_order: 0 });
    await load();
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <h2>部屋管理</h2>
      <div className="card form">
        <input placeholder="部屋名 例: 書斎" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="階層 例: 1F" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} />
        <textarea placeholder="説明" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <button onClick={submit}>部屋を追加</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>部屋名</th><th>階層</th><th>説明</th></tr></thead>
          <tbody>
            {rooms.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.floor}</td><td>{r.description}</td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
