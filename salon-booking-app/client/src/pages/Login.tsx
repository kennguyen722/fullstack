import { FormEvent, useEffect, useState } from 'react';
import { login, useAuth } from '../shared/auth';
import { api, API_URL } from '../shared/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('admin@salon.local');
  const [password, setPassword] = useState('Admin123!');
  const [err, setErr] = useState('');
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    // Quick health check to help diagnose connectivity/CORS issues
    api.get('/health')
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const u = await login(email, password);
      setUser(u);
      nav('/');
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error;
      if (status === 0 || status === undefined) {
        setErr(`Cannot reach API at ${API_URL}. Is the server running?`);
      } else {
        setErr(msg || `Login failed (HTTP ${status})`);
      }
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="mb-3">Sign in</h3>
              {apiOk === false && (
                <div className="alert alert-warning mb-3">
                  Unable to reach API at <code>{API_URL}</code>. Start the server and retry.
                </div>
              )}
              {err && <div className="alert alert-danger">{err}</div>}
              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label htmlFor="loginEmail" className="form-label">Email</label>
                  <input id="loginEmail" className="form-control" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label htmlFor="loginPassword" className="form-label">Password</label>
                  <input id="loginPassword" type="password" className="form-control" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button className="btn btn-primary w-100">Login</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
