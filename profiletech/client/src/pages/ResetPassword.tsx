import { useEffect, useState } from 'react';
import { api } from '../shared/api';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return setError('Missing token');
    if (pw.length < 8) return setError('Password must be at least 8 characters');
    if (pw !== pw2) return setError('Passwords do not match');
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword: pw });
      if (res.data?.ok) setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Invalid or expired link');
    }
  }

  if (done) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="alert alert-success">
            Your password has been reset. You can now <a href="/login">sign in</a>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card p-4 shadow-sm">
          <h3 className="mb-3">Reset your password</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label htmlFor="rp-new" className="form-label">New password</label>
              <input id="rp-new" className="form-control" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="mb-3">
              <label htmlFor="rp-new2" className="form-label">Confirm new password</label>
              <input id="rp-new2" className="form-control" type="password" value={pw2} onChange={e => setPw2(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary w-100">Set new password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
