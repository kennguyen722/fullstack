import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { useAuth } from '../../shared/auth';

export default function MyAvailability() {
  const { user } = useAuth();
  const [me, setMe] = useState<{ id:number; firstName?:string; lastName?:string; photoUrl?:string } | null>(null);
  const [myShifts, setMyShifts] = useState<{id:number; start:string; end:string}[]>([]);
  const [myShiftForm, setMyShiftForm] = useState({ date: '', startTime: '09:00', endTime: '17:00' });
  const [editMyShift, setEditMyShift] = useState<{id:number; date:string; startTime:string; endTime:string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user?.role === 'EMPLOYEE') {
      loadMe();
      loadMyShifts();
    }
  }, [user]);

  async function loadMe() {
    try {
      const res = await api.get('/me/employee');
      setMe(res.data);
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }

  async function loadMyShifts() {
    setIsLoading(true);
    try {
      const res = await api.get('/shifts/my');
      setMyShifts(res.data || []);
    } catch (e) {
      console.error('Failed to load my shifts:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddMyShift(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!myShiftForm.date || !myShiftForm.startTime || !myShiftForm.endTime) return;
      await api.post('/shifts/my', {
        start: new Date(`${myShiftForm.date}T${myShiftForm.startTime}`).toISOString(),
        end: new Date(`${myShiftForm.date}T${myShiftForm.endTime}`).toISOString(),
      });
      setMyShiftForm({ date: '', startTime: '09:00', endTime: '17:00' });
      await loadMyShifts();
      alert('Shift added');
    } catch (e: any) {
      alert(`Failed to add shift: ${e.response?.data?.error || e.message}`);
    }
  }

  function openEditMyShift(s: {id:number; start:string; end:string}) {
    const d = new Date(s.start);
    const date = d.toISOString().split('T')[0];
    const startTime = d.toTimeString().slice(0,5);
    const endTime = new Date(s.end).toTimeString().slice(0,5);
    setEditMyShift({ id: s.id, date, startTime, endTime });
  }

  async function submitEditMyShift(e: React.FormEvent) {
    e.preventDefault();
    if (!editMyShift) return;
    try {
      await api.put(`/shifts/${editMyShift.id}`, {
        start: new Date(`${editMyShift.date}T${editMyShift.startTime}`).toISOString(),
        end: new Date(`${editMyShift.date}T${editMyShift.endTime}`).toISOString(),
      });
      setEditMyShift(null);
      loadMyShifts();
    } catch (err: any) {
      alert(`Failed to update shift: ${err.response?.data?.error || err.message}`);
    }
  }

  async function deleteMyShift(id: number) {
    if (!confirm('Delete this shift?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      loadMyShifts();
    } catch (err: any) {
      alert(`Failed to delete shift: ${err.response?.data?.error || err.message}`);
    }
  }

  if (!user || user.role !== 'EMPLOYEE') {
    return (
      <div className="card">
        <div className="card-body">Only staff can access this page.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">My Availability</h2>
      </div>

      {/* Profile avatar uploader */}
      <div className="card mb-4">
        <div className="card-body d-flex align-items-center justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            {me?.photoUrl ? (
              <img src={me.photoUrl} alt="My avatar" className="rounded-circle avatar-md" />
            ) : (
              <div className="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center avatar-md">
                <span className="fw-semibold">
                  {((me?.firstName?.[0] || '') + (me?.lastName?.[0] || '') || 'ME').toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="fw-semibold">My Profile Photo</div>
              <div className="text-muted small">PNG, JPG, or WEBP up to 5MB</div>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('avatar') as HTMLInputElement) || null;
              const file = input?.files?.[0];
              if (!file) return;
              try {
                setIsUploading(true);
                const form = new FormData();
                form.append('avatar', file);
                const res = await api.post('/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                setMe((prev) => prev ? { ...prev, photoUrl: res.data.photoUrl } : prev);
              } catch (err: any) {
                alert(`Failed to upload avatar: ${err.response?.data?.error || err.message}`);
              } finally {
                setIsUploading(false);
              }
            }}
          >
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="flex-grow-1">
                <input name="avatar" type="file" accept="image/*" className="form-control" aria-label="Choose avatar image" />
              </div>
              <button className="btn btn-primary btn-center btn-min-120 flex-shrink-0" type="submit" disabled={isUploading}>
                {isUploading ? 'Uploading…' : 'Upload'}
              </button>
              {me?.photoUrl && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-center btn-min-120 flex-shrink-0"
                  onClick={async () => {
                    if (!confirm('Remove your profile photo?')) return;
                    try {
                      await api.delete('/me/avatar');
                      setMe(prev => prev ? { ...prev, photoUrl: undefined } : prev);
                    } catch (err: any) {
                      alert(`Failed to remove avatar: ${err.response?.data?.error || err.message}`);
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="mb-3">Add a Shift</h5>
          <form className="row g-2" onSubmit={handleAddMyShift}>
            <div className="col-12 col-md-4">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={myShiftForm.date} onChange={(e)=>setMyShiftForm({...myShiftForm, date: e.target.value})} aria-label="Shift date" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Start</label>
              <input type="time" className="form-control" value={myShiftForm.startTime} onChange={(e)=>setMyShiftForm({...myShiftForm, startTime: e.target.value})} aria-label="Shift start time" />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">End</label>
              <input type="time" className="form-control" value={myShiftForm.endTime} onChange={(e)=>setMyShiftForm({...myShiftForm, endTime: e.target.value})} aria-label="Shift end time" />
            </div>
            <div className="col-12 col-md-2 d-flex">
              <button className="btn btn-primary mt-auto" type="submit">Add Shift</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="mb-3">Upcoming Shifts</h5>
          {isLoading ? (
            <div className="text-muted">Loading shifts…</div>
          ) : myShifts.length === 0 ? (
            <div className="text-muted">No shifts yet</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="w-150">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myShifts
                    .slice()
                    .sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.start).toLocaleDateString()}</td>
                      <td>{new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{new Date(s.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={()=>openEditMyShift(s)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteMyShift(s.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editMyShift && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={submitEditMyShift}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Shift</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>setEditMyShift(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label" htmlFor="edit-shift-date">Date</label>
                      <input id="edit-shift-date" type="date" className="form-control" value={editMyShift.date} onChange={(e)=>setEditMyShift({...editMyShift, date: e.target.value})} aria-label="Date"/>
                    </div>
                    <div className="col-3">
                      <label className="form-label" htmlFor="edit-shift-start">Start</label>
                      <input id="edit-shift-start" type="time" className="form-control" value={editMyShift.startTime} onChange={(e)=>setEditMyShift({...editMyShift, startTime: e.target.value})} aria-label="Start time"/>
                    </div>
                    <div className="col-3">
                      <label className="form-label" htmlFor="edit-shift-end">End</label>
                      <input id="edit-shift-end" type="time" className="form-control" value={editMyShift.endTime} onChange={(e)=>setEditMyShift({...editMyShift, endTime: e.target.value})} aria-label="End time"/>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-center" onClick={()=>setEditMyShift(null)} aria-label="Close">Cancel</button>
                    <button type="submit" className="btn btn-primary btn-center">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
