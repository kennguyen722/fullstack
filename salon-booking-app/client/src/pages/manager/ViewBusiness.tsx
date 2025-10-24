import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import PasswordModal from '../../components/PasswordModal';

export default function ViewBusiness() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwBiz, setPwBiz] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/businesses');
      setBusinesses(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load businesses');
      setTimeout(()=>setMessage(''),4000);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);

  function beginEdit(b:any) {
    setEditing(b.id);
    setEditForm({ ...b });
  }

  function cancelEdit() { setEditing(null); setEditForm(null); }

  async function saveEdit() {
    if (!editing || !editForm) return;
    try {
      await api.put(`/businesses/${editing}`, editForm);
      setMessage('Business updated');
      setTimeout(()=>setMessage(''), 3000);
      await load();
      cancelEdit();
    } catch (err:any) {
      console.error(err);
      setMessage(err?.response?.data?.error || 'Failed to update');
      setTimeout(()=>setMessage(''), 4000);
    }
  }

  function openSetPassword(bizId:number){ setPwBiz(bizId); setPwModalOpen(true); }

  async function handlePwSave(pw:string){
    if (!pwBiz) return;
    try{
      await api.post(`/businesses/${pwBiz}/set-admin-password`, { password: pw });
      setMessage('Admin password updated');
      setTimeout(()=>setMessage(''),3000);
    }catch(err:any){
      setMessage(err?.response?.data?.error || 'Failed to set password');
      setTimeout(()=>setMessage(''),4000);
    }finally{
      setPwModalOpen(false); setPwBiz(null);
    }
  }

  return (
    <div>
      <h3>View Businesses</h3>
      <p className="text-muted">View and manage existing businesses. Update info, change admin email, or set admin password.</p>
      {message && <div className="alert alert-info">{message}</div>}

      <div className="card">
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
                    <th>Website</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map(b => (
                    <tr key={b.id}>
                      <td>
                        {editing === b.id ? (
                          <input className="form-control" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
                        ) : b.name}
                      </td>
                      <td>{editing === b.id ? <input className="form-control" value={editForm.domain||''} onChange={(e)=>setEditForm({...editForm, domain: e.target.value})} /> : (b.domain || '-')}</td>
                      <td>{editing === b.id ? <input className="form-control" value={editForm.website||''} onChange={(e)=>setEditForm({...editForm, website: e.target.value})} /> : (b.website || '-')}</td>
                      <td>{editing === b.id ? <input className="form-control" value={editForm.email||''} onChange={(e)=>setEditForm({...editForm, email: e.target.value})} /> : (b.email || '-')}</td>
                      <td>
                        {editing === b.id ? (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                            <button className="btn btn-outline-secondary" onClick={cancelEdit}>Cancel</button>
                          </div>
                        ) : (
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={()=>beginEdit(b)}>Edit</button>
                            <button className="btn btn-outline-secondary" onClick={()=>openSetPassword(b.id)} title="Set admin password"><i className="bi bi-key"/></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PasswordModal show={pwModalOpen} onClose={()=>setPwModalOpen(false)} onSave={handlePwSave} />
    </div>
  );
}
