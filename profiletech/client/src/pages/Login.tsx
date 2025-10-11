import { useState } from 'react';
import { api } from '../shared/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      window.dispatchEvent(new Event('auth-changed'));
  navigate('/myprofile');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed');
    }
  }
  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <div className="card p-4 shadow-sm">
          <h3 className="mb-3">Sign in</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">Email</label>
              <input id="login-email" className="form-control" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label htmlFor="login-password" className="form-label">Password</label>
              <input id="login-password" type="password" className="form-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" type="submit">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}
