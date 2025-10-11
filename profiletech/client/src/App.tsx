import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './shared/api';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import MyProfile from './pages/MyProfile';

export default function App() {
  // Theme management
  const [theme, setTheme] = useState<string>(() => {
    const t = localStorage.getItem('theme') || 'dark';
    return t === 'dark' || t === 'purple-light' || t === 'executive' ? t : 'dark';
  });
  // Navbar brand data (from profile)
  const [brandName, setBrandName] = useState<string>('');
  const [brandTagline, setBrandTagline] = useState<string>('');

  // Auth state (reactive)
  type AuthUser = { id: number; email: string; name?: string; role?: string } | null;
  const readAuth = () => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    let user: AuthUser = null;
    try { user = userRaw ? JSON.parse(userRaw) : null; } catch { user = null; }
    return { token, user } as const;
  };
  const [auth, setAuth] = useState(() => readAuth());
  useEffect(() => {
    const update = () => setAuth(readAuth());
    const onThemeChanged = () => {
      const t = localStorage.getItem('theme') || 'dark';
      setTheme(t);
    };
    window.addEventListener('storage', update);
    window.addEventListener('auth-changed', update as EventListener);
    window.addEventListener('theme-changed', onThemeChanged as EventListener);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('auth-changed', update as EventListener);
      window.removeEventListener('theme-changed', onThemeChanged as EventListener);
    };
  }, []);

  // Load brand name/tagline from profile (private if logged-in, public otherwise)
  useEffect(() => {
    let cancelled = false;
    async function loadBrand() {
      try {
        const token = localStorage.getItem('token');
        const url = token ? '/profile/me' : '/profile/public';
        const res = await api.get(url);
        const prof = res?.data?.profile || {};
        if (!cancelled) {
          setBrandName(String(prof.displayName || ''));
          setBrandTagline(String(prof.headline || ''));
        }
      } catch {
        if (!cancelled) {
          setBrandName('');
          setBrandTagline('');
        }
      }
    }
    loadBrand();
    const onProfileUpdated = () => loadBrand();
    const onAuthChanged = () => loadBrand();
    const onStorage = (ev: StorageEvent) => { if (ev.key === 'profileUpdatedAt') loadBrand(); };
    window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);


  useEffect(() => {
    const root = document.documentElement;
    // apply data-theme on :root; default 'dark'
    // normalize unsupported values to dark
    if (theme !== 'dark' && theme !== 'purple-light' && theme !== 'executive') {
      setTheme('dark');
      return;
    }
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'purple-light') {
      root.setAttribute('data-theme', 'purple-light');
    } else if (theme === 'executive') {
      root.setAttribute('data-theme', 'executive');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark navbar-professional">
        <div className="container">
          {(() => {
            const computedBrandName = (brandName || '').trim() || 'Profile';
            const computedTagline = (brandTagline || '').trim() || 'Professional Profile';
            return (
              <Link className="navbar-brand brand-title" to="/" aria-label={`${computedBrandName} professional profile`}>
                <span className="brand-name">{computedBrandName}</span>
                <span className="brand-sep" aria-hidden>•</span>
                <span className="brand-tagline d-none d-md-inline">{computedTagline}</span>
                <span className="brand-tagline-short d-inline d-md-none">{computedTagline}</span>
              </Link>
            );
          })()}
            <div className="navbar-nav ms-auto align-items-center gap-2">
            {/* My Profile link removed per request; use dropdown item instead */}
            {Boolean(auth.token) ? (
              <AccountNavChip email={auth.user?.email || ''} />
            ) : (
              <Link className="btn btn-outline-light btn-sm" to="/login">Login</Link>
            )}
            {/* Theme selector moved to Profile page Settings */}
          </div>
        </div>
      </nav>
      <div className="container py-4">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/myprofile" element={<MyProfile />} />
          <Route path="/myprofile/:id" element={<MyProfile />} />
          <Route path="/" element={<Navigate to="/myprofile" replace />} />
        </Routes>
      </div>
    </>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  const userRaw = localStorage.getItem('user');
  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    const isAdmin = Boolean(user && (user.role === 'ADMIN' || user.email === 'admin@example.com'));
  if (!isAdmin) return <Navigate to="/myprofile" replace />;
  } catch {
  return <Navigate to="/myprofile" replace />;
  }
  return children;
}

function LogoutButton() {
  const navigate = useNavigate();
  function onLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // notify other components
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/myprofile');
  }
  return (
    <button className="btn btn-outline-light btn-sm" onClick={onLogout}>Logout</button>
  );
}

function ThemeSwitcher({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      aria-label="Theme selector"
      className="form-select form-select-sm bg-transparent text-light border-secondary theme-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="dark">Dark (Professional)</option>
      <option value="purple-light">Light • Purple</option>
      <option value="executive">Executive • Navy/Gold</option>
  {/* Blue theme removed per request */}
    </select>
  );
}

function AccountNavChip({ email }: { email: string }) {
  const navigate = useNavigate();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/myprofile');
  }
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) {
          setProfileId(null);
          setAvatar(null);
        }
        return;
      }
      try {
        const res = await api.get('/profile/me');
        const prof = res?.data?.profile || {};
        const id = prof?.id;
        const photoUrl = prof?.photoUrl ? String(prof.photoUrl) : '';
        if (!cancelled) {
          setProfileId(typeof id === 'number' ? id : null);
          setAvatar(photoUrl || null);
        }
      } catch {
        if (!cancelled) {
          setProfileId(null);
          setAvatar(null);
        }
      }
    }
    load();
    const onAuthChanged = () => load();
    const onProfileUpdated = () => load();
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
    };
  }, []);
  return (
    <div className="dropdown ms-2">
      <button
        className="btn btn-outline-light btn-sm d-flex align-items-center gap-2 account-chip"
        type="button"
        id="accountChipDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        title={email || 'Account'}
      >
        {avatar ? (
          <img src={avatar} alt="avatar" className="avatar-20 me-1" onError={() => setAvatar(null)} />
        ) : (
          <span aria-hidden className="d-inline-flex acc-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 10v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M16 11a3 3 0 1 0 0-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
        )}
        <span className="text-truncate maxw-200">{email || 'Account'}</span>
  <span aria-hidden className="d-inline-flex ms-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="accountChipDropdown">
        <li>
          <Link className="dropdown-item" to={profileId ? `/myprofile/${profileId}` : '/myprofile'}>View Public Profile</Link>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <Link className="dropdown-item" to="/profile">Edit Profile</Link>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button className="dropdown-item" onClick={logout}>Logout</button>
        </li>
      </ul>
    </div>
  );
}

// RootRedirect no longer needed; landing goes to /myprofile always
