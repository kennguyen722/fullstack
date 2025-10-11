import { useState } from 'react';
import { api } from '../shared/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (e: any) {
      // Still show success to avoid enumeration
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="alert alert-success">
            If an account exists for {email || 'that email'}, you'll receive a password reset link shortly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card p-4 shadow-sm">
          <h3 className="mb-3">Forgot password</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label htmlFor="fp-email" className="form-label">Email</label>
              <input id="fp-email" className="form-control" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-100">Send reset link</button>
          </form>
        </div>
      </div>
    </div>
  );
}
