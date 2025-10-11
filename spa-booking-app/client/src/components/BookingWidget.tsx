import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function BookingWidget() {
  const [services, setServices] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ clientName: '', clientEmail: '', serviceId: '', employeeId: '', startTime: '' });
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get('/services/public').then(res => setServices(res.data));
    api.get('/employees', { headers: {} }).then(res => setEmployees(res.data)).catch(() => {
      // For public usage (no token), provide employee list via a public endpoint in production.
      // For demo, we call protected and ignore failure; you can create /employees/public similarly.
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null); setErr(null);
    try {
      const { data } = await api.post('/appointments/public', form);
      setOk('Appointment request submitted! Check your email.');
      setForm({ clientName: '', clientEmail: '', clientPhone: '', serviceId: '', employeeId: '', startTime: '' });
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Failed to submit');
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
      {ok && <div style={{ color: 'green' }}>{ok}</div>}
      {err && <div style={{ color: 'red' }}>{err}</div>}
      <input placeholder="Your Name" value={form.clientName||''} onChange={e => setForm({...form, clientName: e.target.value})} />
      <input placeholder="Your Email" value={form.clientEmail||''} onChange={e => setForm({...form, clientEmail: e.target.value})} />
      <input placeholder="Your Phone" value={form.clientPhone||''} onChange={e => setForm({...form, clientPhone: e.target.value})} />
      <select value={form.serviceId||''} onChange={e => setForm({...form, serviceId: Number(e.target.value)})}>
        <option value="">Select Service</option>
        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <input type="datetime-local" value={form.startTime||''} onChange={e => setForm({...form, startTime: e.target.value})} />
      <input placeholder="Preferred Staff (ID)" value={form.employeeId||''} onChange={e => setForm({...form, employeeId: Number(e.target.value)})} />
      <button type="submit">Request Appointment</button>
    </form>
  );
}
