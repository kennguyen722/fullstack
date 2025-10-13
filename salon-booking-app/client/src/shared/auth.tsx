import { createContext, useContext, useState } from 'react';
import { api } from './api';

type User = { id: number; email: string; role: 'ADMIN' | 'EMPLOYEE' };

const AuthCtx = createContext<{ user: User | null; setUser: (u: User | null) => void }>({ user: null, setUser: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  return <AuthCtx.Provider value={{ user, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx); }

export async function login(email: string, password: string) {
  const r = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', r.data.token);
  return r.data.user as User;
}

export function logout() { localStorage.removeItem('token'); }

export async function getMe(): Promise<User | null> {
  try {
    const r = await api.get('/auth/me');
    return r.data as User;
  } catch {
    return null;
  }
}
