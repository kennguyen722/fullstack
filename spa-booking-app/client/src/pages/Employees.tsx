import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Employees() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', email: '' });

  async function load() {
    const { data } = await api.get('/employees');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/employees', form);
    setForm({ name: '', email: '', phone: '', bio: '' });
    await load();
  }

  return (
    <div>
      <h2>Employees</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Name" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="Email" value={form.email||''} onChange={e => setForm({...form, email: e.target.value})} />
        <input placeholder="Phone" value={form.phone||''} onChange={e => setForm({...form, phone: e.target.value})} />
        <input placeholder="Bio" value={form.bio||''} onChange={e => setForm({...form, bio: e.target.value})} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map(it => <li key={it.id}>{it.name} — {it.email}</li>)}
      </ul>
    </div>
  );
}
