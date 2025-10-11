import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { setAuthToken } from './lib/api';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Services from './pages/Services';
import Appointments from './pages/Appointments';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000');

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    setAuthToken(token || undefined);
  }, [token]);

  useEffect(() => {
    socket.on('appointment:new', (payload) => {
      console.log('[Socket] New appointment', payload);
      alert('New appointment received!');
    });
    socket.on('appointment:update', (payload) => {
      console.log('[Socket] Appointment updated', payload);
    });
    return () => {
      socket.off('appointment:new');
      socket.off('appointment:update');
    };
  }, []);

  const navigate = useNavigate();
  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    navigate('/');
  }

  return (
    <div style={{ fontFamily: 'system-ui', margin: 16 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/employees">Employees</Link>
        <Link to="/services">Services</Link>
        <Link to="/appointments">Appointments</Link>
        {token ? <button onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login onLogin={(t) => { localStorage.setItem('token', t); setToken(t); }} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/services" element={<Services />} />
        <Route path="/appointments" element={<Appointments />} />
      </Routes>
    </div>
  );
}
