import { useEffect, useState } from 'react';
import { api } from '../../shared/api';

export default function ApplicationManager() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', domain: '', address: '', phone: '', email: '', adminPassword: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/businesses');
      setBusinesses(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load businesses');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function validateForm() {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Admin email is required';
    // basic domain validation when present
    if (form.domain && !/^[a-z0-9.-]+$/i.test(form.domain)) return 'Domain contains invalid characters';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) {
      setMessage(err);
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/businesses', form);
      setMessage('Business created');
      setForm({ name: '', domain: '', address: '', phone: '', email: '', adminPassword: '' });
      await load();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.error || 'Failed to create business');
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  return (
    <div>
      <h3>Application Manager</h3>
      <p className="text-muted">Create and manage businesses that use this application. Only visible to the platform super account.</p>
      {message && <div className="alert alert-info" role="status">{message}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSubmit} aria-label="Create business form">
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label" htmlFor="biz-name">Business name</label>
                <input id="biz-name" className="form-control" placeholder="Business name" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} required />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="biz-domain">Domain (optional)</label>
                <input id="biz-domain" className="form-control" placeholder="example.com" value={form.domain} onChange={(e)=>setForm({...form, domain: e.target.value})} />
              </div>

              <div className="col-md-6">
                <label className="form-label" htmlFor="biz-email">Admin email</label>
                <input id="biz-email" className="form-control" placeholder="admin@business.com" type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} required />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="biz-password">Admin password (optional)</label>
                <input id="biz-password" className="form-control" placeholder="Leave blank to auto-generate" type="password" value={form.adminPassword} onChange={(e)=>setForm({...form, adminPassword: e.target.value})} />
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="biz-address">Address</label>
                <input id="biz-address" className="form-control" placeholder="Address" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="biz-phone">Phone</label>
                <input id="biz-phone" className="form-control" placeholder="Phone" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div className="mt-3">
              <button className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Business'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Existing Businesses</strong>
          <div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => load()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading</span></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Domain</th>
                    <th>Email</th>
                    <th style={{width:120}}>Users</th>
                    <th style={{width:140}}></th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b:any) => (
                    <tr key={b.id}>
                      <td className="fw-medium">{b.name}</td>
                      <td>{b.domain || <span className="text-muted">-</span>}</td>
                      <td>{b.email || <span className="text-muted">-</span>}</td>
                      <td>{b.users?.length ?? 0}</td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <button className="btn btn-outline-primary" onClick={() => setExpanded(prev => ({...prev, [b.id]: !prev[b.id]}))}>
                            {expanded[b.id] ? 'Hide Users' : 'View Users'}
                          </button>
                          {/* Future actions: Edit, Manage, Delete (server-side endpoints needed) */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {businesses.map((b:any) => (
                expanded[b.id] ? (
                  <div key={`users-${b.id}`} className="card mb-3">
                    <div className="card-header">Users for {b.name}</div>
                    <div className="card-body">
                      {b.users && b.users.length > 0 ? (
                        <ul className="list-group">
                          {b.users.map((u:any) => (
                            <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-medium">{u.email}</div>
                                <small className="text-muted">role: {u.role}</small>
                              </div>
                              <div>
                                <small className="text-muted">id: {u.id}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-muted">No users in this business</div>
                      )}
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
