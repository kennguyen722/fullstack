import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Appointments() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data } = await api.get('/appointments');
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    await api.put(`/appointments/${id}/status`, { status });
    await load();
  }

  async function remove(id: number) {
    await api.delete(`/appointments/${id}`);
    await load();
  }

  return (
    <div>
      <h2>Appointments</h2>
      <ul>
        {items.map(it => (
          <li key={it.id}>
            #{it.id} {it.clientName} — {new Date(it.startTime).toLocaleString()} — {it.service?.name} — {it.status}
            <button onClick={() => updateStatus(it.id, 'CONFIRMED')}>Confirm</button>
            <button onClick={() => updateStatus(it.id, 'CANCELLED')}>Cancel</button>
            <button onClick={() => remove(it.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
