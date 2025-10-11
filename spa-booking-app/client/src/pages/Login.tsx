import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@spa.local');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      onLogin(data.token);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed');
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
      <h2>Admin Login</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Login</button>
    </form>
  );
}
