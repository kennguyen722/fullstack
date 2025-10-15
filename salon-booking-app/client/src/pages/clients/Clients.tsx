import { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/api';
import { useAuth } from '../../shared/auth';

type Appt = {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  start: string;
  end: string;
  status: string;
  service: { id: number; name: string; durationMin: number; priceCents: number };
};

type ClientGroup = {
  key: string;
  name: string;
  email?: string;
  phone?: string;
  appts: Appt[];
  lastAppt?: Appt;
  nextAppt?: Appt;
};

export default function Clients() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [birthdays, setBirthdays] = useState<Record<string, string>>(()=>{
    try { return JSON.parse(localStorage.getItem('client.birthdays.v1')||'{}'); } catch { return {}; }
  });

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const endpoint = user?.role === 'ADMIN' ? '/appointments' : '/appointments/my';
      const res = await api.get(endpoint);
      setAppts(res.data || []);
    } catch (e) {
      console.error('Failed to load appointments for clients:', e);
    } finally {
      setLoading(false);
    }
  }

  const clients = useMemo<ClientGroup[]>(() => {
    const byKey = new Map<string, ClientGroup>();
    for (const a of appts) {
      const key = (a.clientEmail && a.clientEmail.trim().toLowerCase()) || (a.clientPhone?.trim()) || a.clientName.trim().toLowerCase();
      const existing = byKey.get(key) || {
        key,
        name: a.clientName,
        email: a.clientEmail,
        phone: a.clientPhone,
        appts: [],
      } as ClientGroup;
      existing.name = existing.name || a.clientName;
      existing.email = existing.email || a.clientEmail;
      existing.phone = existing.phone || a.clientPhone;
      existing.appts.push(a);
      byKey.set(key, existing);
    }
    const groups = Array.from(byKey.values());
    for (const g of groups) {
      g.appts.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());
      g.lastAppt = g.appts.filter(x=> new Date(x.start) <= new Date()).slice(-1)[0];
      g.nextAppt = g.appts.find(x=> new Date(x.start) > new Date());
    }
    return groups;
  }, [appts]);

  // Overall stats and per-client stats
  const { overall, perClient } = useMemo(() => {
    const per: Record<string, { totalBookings: number; totalSpend: number; popularServiceId?: number; popularServiceName?: string; popularCount: number }> = {};
    const serviceCount: Record<number, { name: string; count: number }> = {};
    for (const a of appts) {
      const key = (a.clientEmail && a.clientEmail.trim().toLowerCase()) || (a.clientPhone?.trim()) || a.clientName.trim().toLowerCase();
      per[key] = per[key] || { totalBookings: 0, totalSpend: 0, popularCount: 0 };
      per[key].totalBookings += 1;
      per[key].totalSpend += (a.service?.priceCents || 0) / 100;
      // Track client service frequency
      const svcId = a.service?.id;
      if (svcId) {
        const ckey = `${key}:${svcId}`;
        (per as any)[ckey] = ((per as any)[ckey] || 0) + 1;
      }
      // Overall service frequency
      if (svcId) {
        serviceCount[svcId] = serviceCount[svcId] || { name: a.service.name, count: 0 };
        serviceCount[svcId].count += 1;
      }
    }
    // Determine popular service per client
    for (const c of clients) {
      const stats = per[c.key];
      if (!stats) continue;
      let maxSvcId: number | undefined;
      let maxCount = 0;
      for (const a of c.appts) {
        const svcId = a.service?.id;
        if (!svcId) continue;
        const ckey = `${c.key}:${svcId}`;
        const cnt = (per as any)[ckey] || 0;
        if (cnt > maxCount) { maxCount = cnt; maxSvcId = svcId; }
      }
      if (maxSvcId) {
        stats.popularServiceId = maxSvcId;
        stats.popularServiceName = c.appts.find(a=>a.service?.id===maxSvcId)?.service.name;
        stats.popularCount = maxCount;
      }
    }
    const overall = {
      totalClients: clients.length,
      totalBookings: appts.length,
      totalRevenue: appts.reduce((s,a)=> s + (a.service?.priceCents||0)/100, 0),
      topServices: Object.entries(serviceCount)
        .sort((a,b)=> b[1].count - a[1].count)
        .slice(0,5)
        .map(([id, v]) => ({ id: Number(id), name: (v as any).name, count: (v as any).count }))
    };
    return { overall, perClient: per };
  }, [appts, clients]);

  // Last 12 months bookings for bar chart
  const monthly = useMemo(() => {
    const map: Record<string, number> = {};
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map[key] = 0;
    }
    for (const a of appts) {
      const d = new Date(a.start);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (key in map) map[key] += 1;
    }
    const labels = Object.keys(map);
    const values = labels.map(k => map[k]);
    const max = Math.max(1, ...values);
    return { labels, values, max };
  }, [appts]);

  // Upcoming birthdays in next 30 days from local mapping
  const upcomingBirthdays = useMemo(() => {
    const result: Array<{ key: string; name: string; date: string; age?: number }> = [];
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    for (const c of clients) {
      const b = birthdays[c.key];
      if (!b) continue;
      const d = new Date(b);
      // next occurrence this year
      const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      if (next <= in30) {
        const age = now.getFullYear() - d.getFullYear();
        result.push({ key: c.key, name: c.name, date: next.toDateString(), age });
      }
    }
    return result.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [clients, birthdays]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [clients, search]);

  function openNewAppointmentPrefill(c: ClientGroup) {
    // Navigate by setting hash with prefill; the Appointments page can read location.hash to prefill
    const params = new URLSearchParams();
    params.set('clientName', c.name);
    if (c.email) params.set('clientEmail', c.email);
    if (c.phone) params.set('clientPhone', c.phone);
    window.location.href = `/appointments#${params.toString()}`;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-400">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Clients</h2>
        <span className="badge bg-light text-dark">{filtered.length} clients</span>
      </div>

      {/* Overview Stats */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">Total Clients</div>
              <div className="display-6">{overall.totalClients}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">Total Bookings</div>
              <div className="display-6">{overall.totalBookings}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">Total Revenue</div>
              <div className="display-6">${overall.totalRevenue.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">Top Services</div>
              <div>
                {overall.topServices.length === 0 ? (
                  <span className="text-muted">—</span>
                ) : overall.topServices.map(s => (
                  <div key={s.id} className="d-flex justify-content-between small"><span>{s.name}</span><span className="text-muted">{s.count}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Bookings Chart (last 12 months) */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Bookings per Month</h5>
            <span className="text-muted small">Last 12 months</span>
          </div>
          <div className="h-220">
            <svg viewBox={`0 0 ${monthly.labels.length*40} 200`} width="100%" height="100%" role="img" aria-label="Bookings per month bar chart">
              {monthly.labels.map((label, idx) => {
                const v = monthly.values[idx];
                const h = monthly.max ? Math.round((v / monthly.max) * 160) : 0;
                const x = idx*40 + 20;
                const y = 180 - h;
                return (
                  <g key={label}>
                    <rect x={x} y={y} width={24} height={h} rx={4} fill="url(#grad)" />
                    <text x={x+12} y={190} textAnchor="middle" fontSize="10" fill="currentColor">{label.slice(5)}</text>
                    {v>0 && <text x={x+12} y={y-4} textAnchor="middle" fontSize="10" fill="currentColor">{v}</text>}
                  </g>
                );
              })}
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-sm-6 col-md-4">
              <label className="form-label">Search</label>
              <input className="form-control" placeholder="Name, email, phone" value={search} onChange={(e)=>setSearch(e.target.value)} />
            </div>
            <div className="col-sm-6 col-md-4">
              <label className="form-label">Upcoming Birthdays (30 days)</label>
              <div className="form-control bg-light min-h-38">
                {upcomingBirthdays.length === 0 ? (
                  <span className="text-muted">—</span>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {upcomingBirthdays.map(b => (
                      <span key={b.key} className="badge bg-primary">{b.name} · {b.date}{b.age?` (${b.age})`:''}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bi bi-people display-1 text-muted mb-3"></i>
            <h5 className="text-muted">No clients found</h5>
            <p className="text-muted">Clients appear here after their first booking.</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Client</th>
                <th>Last Appointment</th>
                <th>Next Appointment</th>
                <th className="w-150">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.key}>
                  <td>
                    <div className="fw-medium">{c.name}</div>
                    <div className="small text-muted d-flex flex-column">
                      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                      {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                    </div>
                    <div className="small mt-1">
                      <strong>Bookings:</strong> {perClient[c.key]?.totalBookings || 0}
                      {' · '}
                      <strong>Spend:</strong> ${perClient[c.key]?.totalSpend?.toFixed(2) || '0.00'}
                      {perClient[c.key]?.popularServiceName && (
                        <>
                          {' · '}<strong>Fav:</strong> {perClient[c.key]?.popularServiceName}
                        </>
                      )}
                    </div>
                    <div className="small mt-1 d-flex align-items-center gap-2">
                      <label className="form-label mb-0">Birthday</label>
                      <input
                        type="date"
                        className="form-control form-control-sm w-auto"
                        value={birthdays[c.key] || ''}
                        onChange={(e)=>{
                          const next = { ...birthdays, [c.key]: e.target.value };
                          setBirthdays(next);
                          localStorage.setItem('client.birthdays.v1', JSON.stringify(next));
                        }}
                        aria-label="Client birthday"
                      />
                    </div>
                  </td>
                  <td>
                    {c.lastAppt ? (
                      <div>
                        <div>{new Date(c.lastAppt.start).toLocaleDateString()}</div>
                        <small className="text-muted">{c.lastAppt.service.name}</small>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {c.nextAppt ? (
                      <div>
                        <div>{new Date(c.nextAppt.start).toLocaleDateString()}</div>
                        <small className="text-muted">{c.nextAppt.service.name}</small>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {c.phone && (
                        <a className="btn btn-sm btn-outline-secondary" href={`tel:${c.phone}`} aria-label="Call client">
                          <i className="bi bi-telephone"/>
                        </a>
                      )}
                      {c.email && (
                        <a className="btn btn-sm btn-outline-secondary" href={`mailto:${c.email}`} aria-label="Email client">
                          <i className="bi bi-envelope"/>
                        </a>
                      )}
                      <button className="btn btn-sm btn-primary" onClick={()=>openNewAppointmentPrefill(c)}>
                        <i className="bi bi-plus-lg me-1"/>New Appointment
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
