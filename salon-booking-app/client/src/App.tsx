import { NavLink, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Services from './pages/Services';
import Shifts from './pages/Shifts';
import Appointments from './pages/Appointments';
import MyAvailability from './pages/MyAvailability';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Logout from './pages/Logout';
import { getMe, logout, useAuth } from './shared/auth';
import { ThemeProvider } from './shared/ThemeContext';
import { ConfigProvider, useConfig } from './shared/ConfigContext';
import './theme.css';

export default function App() {
  return (
    <ConfigProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ConfigProvider>
  );
}

function AppContent() {
  const [collapsed, setCollapsed] = useState(true);
  const { user, setUser } = useAuth();
  const { config } = useConfig();
  const nav = useNavigate();
  const [showAccountHint, setShowAccountHint] = useState(false);
  
  // Check if we're in public mode (query parameter or specific route)
  const isPublicMode = window.location.search.includes('public=true') || 
                       window.location.pathname === '/public' ||
                       window.location.pathname.startsWith('/public/');

  useEffect(() => {
    // In public mode, don't try to authenticate
    if (!isPublicMode) {
      getMe().then((u) => setUser(u)).catch(() => setUser(null));
    }
  }, [setUser, isPublicMode]);

  // One-time hint to show where Settings/Logout are located (in account menu)
  useEffect(() => {
    if (!isPublicMode && user) {
      const key = 'hint.accountMenu.v1';
      if (!localStorage.getItem(key)) {
        setShowAccountHint(true);
      }
    }
  }, [user, isPublicMode]);

  const handleLogout = () => {
    logout();
    setUser(null);
    nav('/login');
  };

  // Admin route guard
  function RequireAdmin({ children }: { children: JSX.Element }) {
    if (user?.role !== 'ADMIN') return <Navigate to="/appointments" replace />;
    return children;
  }

  // Public mode - only show booking page
  if (isPublicMode) {
    return (
      <div className="min-vh-100 booking-page">
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary topbar">
          <div className="container">
            <span className="navbar-brand fw-semibold">
              <i className="bi bi-calendar-check me-2"></i>
              {config.appTitle}
            </span>
            <div className="navbar-nav ms-auto d-flex align-items-center gap-2">
              <a 
                href="/login" 
                className="btn btn-outline-light btn-sm"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/login';
                }}
              >
                <i className="bi bi-person me-1"></i>
                Staff Login
              </a>
            </div>
          </div>
        </nav>
        <main>
          <Routes>
            <Route path="/public" element={<Booking />} />
            <Route path="/public/booking" element={<Booking />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="*" element={<Booking />} />
          </Routes>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/booking" element={<Booking />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
  <nav className="topbar navbar navbar-expand navbar-dark bg-primary">
        <div className="container-fluid">
          <button 
            className="btn btn-outline-light me-3" 
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-list'}`} />
          </button>
          <span className="navbar-brand fw-semibold">
            <i className="bi bi-calendar-check me-2"></i>
            {config.appTitle}
          </span>
          <div className="ms-auto d-flex align-items-center gap-3">
            {user?.role === 'ADMIN' && (
              <NavLink className="btn btn-outline-light btn-sm" to="/booking">
                <i className="bi bi-calendar-plus me-1"></i>
                Admin Booking
              </NavLink>
            )}
            <a 
              href="/public" 
              className="btn btn-outline-light btn-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="bi bi-globe me-1"></i>
              Public View
            </a>
            <div className="dropdown" title="Account menu: Settings, Logout" aria-label="Account menu: Settings and Logout">
              <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
                <i className="bi bi-person-circle me-2" aria-hidden="true" />
                {user.email}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                {user?.role === 'ADMIN' && (
                  <>
                    <li>
                      <NavLink to="/settings" className="dropdown-item">
                        <i className="bi bi-gear me-2" /> Settings
                      </NavLink>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                  </>
                )}
                <li>
                  <NavLink to="/logout" className="dropdown-item">
                    <i className="bi bi-box-arrow-right me-2" /> Logout
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      {showAccountHint && (
        <div 
          className="toast align-items-center text-bg-primary border-0 position-fixed top-0 end-0 m-3 show z-2000"
          role="alert" aria-live="assertive" aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body">
              <i className="bi bi-person-circle me-2" aria-hidden="true"></i>
              Account menu moved: click your email to access Settings and Logout.
            </div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label="Close"
              onClick={() => {
                localStorage.setItem('hint.accountMenu.v1', '1');
                setShowAccountHint(false);
              }}
            ></button>
          </div>
        </div>
      )}
      <div className="body">
        <aside className="sidebar">
          <ul className="nav flex-column">
            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <NavLink to="/" end className="nav-link" data-tooltip="Dashboard">
                  <i className="bi bi-speedometer2"/>
                  <span className="nav-text">Dashboard</span>
                </NavLink>
              </li>
            )}
            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <NavLink to="/employees" className="nav-link" data-tooltip="Employees">
                  <i className="bi bi-people"/>
                  <span className="nav-text">Employees</span>
                </NavLink>
              </li>
            )}
            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <NavLink to="/services" className="nav-link" data-tooltip="Services">
                  <i className="bi bi-bag-check"/>
                  <span className="nav-text">Services</span>
                </NavLink>
              </li>
            )}
            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <NavLink to="/shifts" className="nav-link" data-tooltip="Shifts">
                  <i className="bi bi-calendar3"/>
                  <span className="nav-text">Shifts</span>
                </NavLink>
              </li>
            )}
            <li className="nav-item">
              <NavLink to="/appointments" className="nav-link" data-tooltip="Appointments">
                <i className="bi bi-journal-check"/>
                <span className="nav-text">Appointments</span>
              </NavLink>
            </li>
            {user?.role === 'ADMIN' && (
              <li className="nav-item">
                <NavLink to="/clients" className="nav-link" data-tooltip="Clients">
                  <i className="bi bi-people"/>
                  <span className="nav-text">Clients</span>
                </NavLink>
              </li>
            )}
            {user?.role === 'EMPLOYEE' && (
              <li className="nav-item">
                <NavLink to="/availability" className="nav-link" data-tooltip="My Availability">
                  <i className="bi bi-calendar2-week"/>
                  <span className="nav-text">My Availability</span>
                </NavLink>
              </li>
            )}
          </ul>
        </aside>
        <main className="content p-4">
          <Routes>
            <Route path="/" element={user?.role === 'ADMIN' ? <Dashboard /> : <Navigate to="/appointments" replace />} />
            <Route path="/employees" element={<RequireAdmin><Employees /></RequireAdmin>} />
            <Route path="/services" element={<RequireAdmin><Services /></RequireAdmin>} />
            <Route path="/shifts" element={<RequireAdmin><Shifts /></RequireAdmin>} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/clients" element={<RequireAdmin><Clients /></RequireAdmin>} />
            <Route path="/availability" element={user?.role === 'EMPLOYEE' ? <MyAvailability /> : <Navigate to="/appointments" replace />} />
            <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
