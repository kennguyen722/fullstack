import { useEffect, useState } from 'react';
import { api } from '../../shared/api';

export default function ApplicationManager() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', domain: '', address: '', phone: '', email: '', adminPassword: '' });
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const res = await api.get('/businesses');
      setBusinesses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api.post('/businesses', form);
      setMessage('Business created');
      setForm({ name: '', domain: '', address: '', phone: '', email: '', adminPassword: '' });
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.error || 'Failed');
      setTimeout(() => setMessage(''), 4000);
    }
  }

  return (
    <div>
      <h3>Application Manager</h3>
      <p className="text-muted">Create and manage businesses that use this application. Only visible to the platform super account.</p>
      {message && <div className="alert alert-info">{message}</div>}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-2">
              <div className="col-md-6"><input className="form-control" placeholder="Business name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Domain (optional)" value={form.domain} onChange={(e)=>setForm({...form, domain: e.target.value})} /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Admin email" type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} required /></div>
              <div className="col-md-6"><input className="form-control" placeholder="Admin password (optional)" type="password" value={form.adminPassword} onChange={(e)=>setForm({...form, adminPassword: e.target.value})} /></div>
              <div className="col-12"><input className="form-control" placeholder="Address" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} /></div>
              <div className="col-12"><input className="form-control" placeholder="Phone" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="mt-3">
              <button className="btn btn-primary">Create Business</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Existing Businesses</div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Name</th><th>Domain</th><th>Email</th><th>Users</th></tr></thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id}><td>{b.name}</td><td>{b.domain}</td><td>{b.email}</td><td>{b.users?.length || 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
