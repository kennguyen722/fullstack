import { Link, NavLink, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
    window.addEventListener('storage', update);
    window.addEventListener('auth-changed', update as EventListener);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('auth-changed', update as EventListener);
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
          <Link className="navbar-brand brand-title" to="/" aria-label="Ken Nguyen professional profile">
            <span className="brand-name">Ken Nguyen</span>
            <span className="brand-sep" aria-hidden>•</span>
            <span className="brand-tagline d-none d-md-inline">Building Scalable Software That Ships</span>
            <span className="brand-tagline-short d-inline d-md-none">Scalable Software, Shipped</span>
          </Link>
            <div className="navbar-nav ms-auto align-items-center gap-2">
            <NavLink
              to="/myprofile"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end
            >
              My Profile
            </NavLink>
            {Boolean(auth.token) && (
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Edit Profile
              </NavLink>
            )}
            {Boolean(auth.token) ? (
              <LogoutButton />
            ) : (
              <Link className="btn btn-outline-light btn-sm" to="/login">Login</Link>
            )}
            {auth.user && (auth.user.role === 'ADMIN' || auth.user.email === 'admin@example.com') ? (
              <div className="ms-2">
                <ThemeSwitcher value={theme} onChange={setTheme} />
              </div>
            ) : null}
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
    navigate('/login');
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

// RootRedirect no longer needed; landing goes to /myprofile always
