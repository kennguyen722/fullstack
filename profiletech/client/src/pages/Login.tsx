import { useEffect, useState } from 'react';
import { api } from '../shared/api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Prefill email with the most recently used/created email
  useEffect(() => {
    const last = localStorage.getItem('lastEmail');
    if (last) setEmail(last);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = mode === 'login'
        ? await api.post('/auth/login', { email, password })
        : await api.post('/auth/register', { email, password, name: email.split('@')[0] || 'User' });
      // Remember the last used/created email for next time
      localStorage.setItem('lastEmail', email);
      localStorage.setItem('token', res.data.token);
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      window.dispatchEvent(new Event('auth-changed'));
      // After registration, go straight to Profile editor for first-time setup
      if (mode === 'register') {
        navigate('/profile');
        return;
      }
      // After login, decide destination based on whether profile exists
      try {
        const me = await api.get('/profile/me');
        if (me.data?.profile) {
          navigate('/myprofile');
        } else {
          navigate('/profile');
        }
      } catch {
        // If check fails, fallback to profile editor so users can create their profile
        navigate('/profile');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || (mode === 'login' ? 'Login failed' : 'Registration failed');
      setError(msg);
    }
  }
  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <div className="card p-4 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(null); }}
            >
              {mode === 'login' ? 'Need an account?' : 'Have an account?'}
            </button>
          </div>
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
            <button className="btn btn-primary w-100" type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
          </form>
          {mode === 'login' && (
            <div className="mt-2 text-center">
              <a className="link-secondary" href="/forgot-password">Forgot your password?</a>
            </div>
          )}
          {mode === 'login' && (
            <div className="mt-3 text-center text-muted">
              Trouble signing in? If this is a fresh deploy, try creating an account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
