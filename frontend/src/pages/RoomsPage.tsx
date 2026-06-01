import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Room } from '../types/room';

const emptyForm = { name: '', floor: '', description: '', sort_order: 0 };

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => setRooms((await api.get('/rooms')).data);
  useEffect(() => { load(); }, []);

  const reset = () => { setEditingId(null); setForm(emptyForm); };

  const submit = async () => {
    if (!form.name) return;
    editingId ? await api.put(`/rooms/${editingId}`, form) : await api.post('/rooms', form);
    reset();
    load();
  };

  const edit = (r: Room) => {
    setEditingId(r.id);
    setForm({ name: r.name, floor: r.floor || '', description: r.description || '', sort_order: r.sort_order || 0 });
  };

  const remove = async (id: number) => {
    if (!confirm('この部屋を削除しますか？')) return;
    await api.delete(`/rooms/${id}`);
    load();
  };

  return (
    <>
      <h2>部屋管理</h2>
      <div className="card form">
        <h3>{editingId ? '部屋を編集' : '部屋を追加'}</h3>
        <input placeholder="部屋名" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="階層 例: 1F" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} />
        <textarea placeholder="説明" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div>
          <button onClick={submit}>{editingId ? '保存' : '部屋を追加'}</button>
          {editingId && <button className="secondary-button" onClick={reset}>キャンセル</button>}
        </div>
      </div>
      <div className="card">
        <table className="table">
          <thead><tr><th>ID</th><th>部屋名</th><th>階層</th><th>説明</th><th>操作</th></tr></thead>
          <tbody>
            {rooms.map(r => <tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.floor}</td><td>{r.description}</td><td><button className="small-button" onClick={() => edit(r)}>編集</button><button className="danger-button" onClick={() => remove(r.id)}>削除</button></td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
