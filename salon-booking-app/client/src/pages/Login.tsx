import { FormEvent, useEffect, useState } from 'react';
import { login, useAuth } from '../shared/auth';
import { api, API_URL } from '../shared/api';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../shared/ConfigContext';

export default function Login() {
  const [email, setEmail] = useState('admin@salon.local');
  const [password, setPassword] = useState('Admin123!');
  const [err, setErr] = useState('');
  const { setUser } = useAuth();
  const { config } = useConfig();
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
    <div className="min-vh-100 login-page">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary topbar">
        <div className="container">
          <span className="navbar-brand fw-semibold">
            <i className="bi bi-calendar-check me-2"></i>
            {config.appTitle}
          </span>
        </div>
      </nav>

      {/* Login Form */}
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="text-center mb-4">
                  <h3 className="mb-2">Staff Sign In</h3>
                  <p className="text-muted small">Access the salon management system</p>
                </div>
                
                {apiOk === false && (
                  <div className="alert alert-warning mb-3">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Unable to reach API at <code>{API_URL}</code>. Start the server and retry.
                  </div>
                )}
                
                {err && (
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-circle me-2"></i>
                    {err}
                  </div>
                )}
                
                <form onSubmit={onSubmit}>
                  <div className="mb-3">
                    <label htmlFor="loginEmail" className="form-label">
                      <i className="bi bi-envelope me-1"></i>
                      Email
                    </label>
                    <input 
                      id="loginEmail" 
                      className="form-control" 
                      placeholder="you@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="loginPassword" className="form-label">
                      <i className="bi bi-lock me-1"></i>
                      Password
                    </label>
                    <input 
                      id="loginPassword" 
                      type="password" 
                      className="form-control" 
                      placeholder="Your password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button className="btn btn-primary w-100 py-2">
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    Sign In
                  </button>
                </form>
                
                <div className="mt-4 pt-3 border-top text-center">
                  <small className="text-muted">
                    <i className="bi bi-shield-check me-1"></i>
                    Secure staff access portal
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
