import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, useAuth } from '../shared/auth';

export default function Logout() {
  const nav = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    logout();
    setUser(null);
    nav('/login', { replace: true });
  }, [nav, setUser]);

  return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status" aria-label="Logging out" />
      <p className="mt-3 mb-0">Signing you out…</p>
    </div>
  );
}
