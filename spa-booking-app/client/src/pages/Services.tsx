import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Services() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', duration: 60, price: 8000 });

  async function load() {
    const { data } = await api.get('/services');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/services', form);
    setForm({ name: '', duration: 60, price: 8000 });
    await load();
  }

  return (
    <div>
      <h2>Services</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Name" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} />
        <input placeholder="Duration (min)" type="number" value={form.duration||60} onChange={e => setForm({...form, duration: Number(e.target.value)})} />
        <input placeholder="Price (cents)" type="number" value={form.price||0} onChange={e => setForm({...form, price: Number(e.target.value)})} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map(it => <li key={it.id}>{it.name} — {Math.round(it.price/100).toLocaleString()} USD</li>)}
      </ul>
    </div>
  );
}
