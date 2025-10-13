import { useEffect, useMemo, useState } from 'react';
import { api } from '../shared/api';
import { useAuth } from '../shared/auth';

interface Appointment {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  start: string;
  end: string;
  status: string;
  createdAt: string;
  service: {
    id: number;
    name: string;
    priceCents: number;
    durationMin: number;
  };
  employee: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMode, setCalendarMode] = useState<'day' | 'week'>('day');
  const [calendarDate, setCalendarDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dragPreview, setDragPreview] = useState<null | { id: number; startQ: number; durQ: number; day?: string; empId?: number }>(null);
  const [showDetails, setShowDetails] = useState<Appointment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    employee: '',
    date: '',
    search: ''
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [blockServices, setBlockServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    serviceId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
    date: '',
    time: ''
  });
  const [showReschedule, setShowReschedule] = useState<Appointment | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    serviceId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
    date: '',
    time: ''
  });
  const [myShiftForm, setMyShiftForm] = useState({ date: '', startTime: '09:00', endTime: '17:00' });
  const [blockForm, setBlockForm] = useState({ date: '', time: '', serviceId: '' });
  const [myShifts, setMyShifts] = useState<{id:number; start:string; end:string}[]>([]);
  const [editMyShift, setEditMyShift] = useState<{id:number; date:string; startTime:string; endTime:string} | null>(null);
  const [myWeekTemplate, setMyWeekTemplate] = useState([
    { day: 1, startTime: '', endTime: '' },
    { day: 2, startTime: '', endTime: '' },
    { day: 3, startTime: '', endTime: '' },
    { day: 4, startTime: '', endTime: '' },
    { day: 5, startTime: '', endTime: '' },
    { day: 6, startTime: '', endTime: '' },
    { day: 7, startTime: '', endTime: '' },
  ]);
  const [myBulkStart, setMyBulkStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [myBulkWeeks, setMyBulkWeeks] = useState(4);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [showFilters, setShowFilters] = useState(false);

  // Prefill from URL hash (e.g., #clientName=...&clientEmail=...)
  const prefill = useMemo(() => {
    try {
      const hash = window.location.hash?.replace(/^#/, '') || '';
      const sp = new URLSearchParams(hash);
      return {
        clientName: sp.get('clientName') || '',
        clientEmail: sp.get('clientEmail') || '',
        clientPhone: sp.get('clientPhone') || '',
      };
    } catch {
      return { clientName: '', clientEmail: '', clientPhone: '' };
    }
  }, [window.location.hash]);

  useEffect(() => {
    loadAppointments();
    if (user?.role === 'ADMIN') {
      loadEmployees();
      loadServices();
    } else if (user) {
      // For staff, pre-load their services for the create modal
      // Also load employees so staff can view team columns and drag across employees
      loadEmployees();
      loadMyServices();
      loadMyEmployee();
      loadBlockServices();
      loadMyShifts();
    }
    // If hash has prefill details, open create modal and seed fields
    if (prefill.clientName || prefill.clientEmail || prefill.clientPhone) {
      setShowCreateModal(true);
      setCreateForm((f) => ({
        ...f,
        clientName: prefill.clientName || f.clientName,
        clientEmail: prefill.clientEmail || f.clientEmail,
        clientPhone: prefill.clientPhone || f.clientPhone,
      }));
      // Clear hash so refresh doesn't re-open
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [appointments, filters]);

  // Tick timer to update the "now" line in calendar day view
  useEffect(() => {
    if (viewMode !== 'calendar' || calendarMode !== 'day') return;
    const interval = setInterval(() => setNowTick(Date.now()), 15000); // update every 15s
    return () => clearInterval(interval);
  }, [viewMode, calendarMode, calendarDate]);

  // Derived: employees to render in calendar columns
  const calendarEmployees = useMemo(() => {
    // Admin: show all employees or filtered one
    if (user?.role === 'ADMIN') {
      if (filters.employee) {
        const emp = employees.find((e: any) => e.id === Number(filters.employee));
        return emp ? [emp] : [];
      }
      return employees;
    }
    // Staff: prefer team list if available (to enable cross-employee drag)
    if (user?.role === 'EMPLOYEE') {
      let list = employees.slice();
      if (filters.employee) {
        list = list.filter((e: any) => e.id === Number(filters.employee));
      }
      // Fallback to just "me" if team list isn't available yet
      if (list.length === 0) {
        const myId = Number(createForm.employeeId || 0);
        const me = myId ? [{ id: myId, firstName: 'Me', lastName: '' }] : [];
        return me as any[];
      }
      return list as any[];
    }
    return [] as any[];
  }, [user, employees, filters.employee, createForm.employeeId]);

  // Helpers for calendar
  function isSameDayISO(iso: string, ymd: string) {
    return new Date(iso).toISOString().slice(0, 10) === ymd;
  }

  function minutesSince(startHour: number, date: Date) {
    return date.getHours() * 60 + date.getMinutes() - startHour * 60;
  }

  function toYMDLocal(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const CAL_START_H = 8; // 8am
  const CAL_END_H = 20; // 8pm
  const CAL_TOTAL_MIN = (CAL_END_H - CAL_START_H) * 60;

  const dayApptsByEmp = useMemo(() => {
    const map: Record<number, Appointment[]> = {};
    const day = calendarDate;
    for (const e of calendarEmployees) map[e.id] = [];
    for (const a of appointments) {
      if (isSameDayISO(a.start, day)) {
        const empId = a.employee?.id || Number(createForm.employeeId || 0);
        if (map[empId]) map[empId].push(a);
      }
    }
    for (const k of Object.keys(map)) {
      map[Number(k)].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [appointments, calendarEmployees, calendarDate, createForm.employeeId]);

  // Week helpers
  function getWeekStart(d: Date) {
    const s = new Date(d);
    s.setDate(d.getDate() - d.getDay());
    s.setHours(0,0,0,0);
    return s;
  }
  const weekDays = useMemo(() => {
    if (calendarMode !== 'week') return [] as string[];
    const base = getWeekStart(new Date(calendarDate));
    return Array.from({length: 7}).map((_,i)=>{
      const d = new Date(base);
      d.setDate(base.getDate()+i);
      return d.toISOString().slice(0,10);
    });
  }, [calendarMode, calendarDate]);

  // Overlap layout for a column of events (same employee+day)
  type LaidOut = { appt: Appointment; colIndex: number; colCount: number };
  function layoutOverlaps(events: Appointment[]): LaidOut[] {
    const result: LaidOut[] = [];
    const sorted = events.slice().sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime());
    let active: { appt: Appointment; end: number; colIndex: number }[] = [];
    for (const appt of sorted) {
      const start = new Date(appt.start).getTime();
      const end = new Date(appt.end).getTime();
      // Remove finished
      active = active.filter(x => x.end > start);
      // Find available colIndex up to 4
      const used = new Set(active.map(x => x.colIndex));
      let idx = 0;
      while (used.has(idx) && idx < 4) idx++;
      if (idx >= 4) idx = 3; // clamp
      active.push({ appt, end, colIndex: idx });
      const colCount = Math.max(1, Math.min(4, active.length));
      // update all active with colCount (approximation)
      for (const x of active) {
        const existing = result.find(r => r.appt.id === x.appt.id);
        if (existing) {
          existing.colCount = Math.max(existing.colCount, colCount);
        } else {
          result.push({ appt: x.appt, colIndex: x.colIndex, colCount: colCount });
        }
      }
    }
    return result;
  }

  function widthLeftClasses(colIndex: number, colCount: number) {
    if (colCount <= 1) return 'w-1-1 l-0-1';
    if (colCount === 2) return colIndex === 0 ? 'w-1-2 l-0-2' : 'w-1-2 l-1-2';
    if (colCount === 3) return ['w-1-3 l-0-3','w-1-3 l-1-3','w-1-3 l-2-3'][Math.min(colIndex,2)];
    // 4 or more
    return ['w-1-4 l-0-4','w-1-4 l-1-4','w-1-4 l-2-4','w-1-4 l-3-4'][Math.min(colIndex,3)];
  }

  function svcColorClass(a: Appointment) {
    const key = a.service?.id || 0;
    const h = (key * 2654435761) % 10; // poor-man hash 0..9
    return `apt-svc-${h}`;
  }

  function onStartDrag(e: React.MouseEvent, a: Appointment, day?: string, empId?: number) {
    // ignore drags when clicking buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.preventDefault();
    const start = new Date(a.start);
    const startM = minutesSince(CAL_START_H, start);
    const startQ = Math.max(0, Math.min(48, Math.round(startM/15)));
    const durM = Math.max(15, (new Date(a.end).getTime() - start.getTime())/60000);
    const durQ = Math.max(1, Math.round(durM/15));
  const originalEmpId = a.employee?.id;
  let current = { id: a.id, startQ, durQ, day, empId: empId ?? originalEmpId } as { id:number; startQ:number; durQ:number; day?:string; empId?:number };
    setDragPreview(current);
    document.body.classList.add('no-select');

    function onMove(ev: MouseEvent) {
      // Determine current column under cursor for cross-employee/day dragging
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const col = el?.closest('.apt-col') as HTMLElement | null;
      if (!col) return;
      const rect = col.getBoundingClientRect();
      const y = ev.clientY - rect.top;
      const mins = Math.max(0, Math.min(CAL_TOTAL_MIN, (y / rect.height) * CAL_TOTAL_MIN));
      const newQ = Math.round(mins / 15);
      const newDay = col.getAttribute('data-day') || day || calendarDate;
      const newEmpIdStr = col.getAttribute('data-emp-id');
      let newEmpId = newEmpIdStr ? Number(newEmpIdStr) : (empId || originalEmpId);
      current = { ...current, startQ: newQ, day: newDay, empId: newEmpId };
      setDragPreview(prev => prev && prev.id === a.id ? { ...prev, startQ: newQ, day: newDay, empId: newEmpId } : prev);
    }
    async function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.classList.remove('no-select');
      if (!current) { setDragPreview(null); return; }
      const dayYMD = current.day || day || calendarDate;
      const newQ = current.startQ;
      const minutes = newQ * 15;
      const dt = new Date(dayYMD + 'T00:00:00');
      dt.setHours(CAL_START_H, 0, 0, 0);
      dt.setMinutes(dt.getMinutes() + minutes);
      try {
        const body: any = { start: dt.toISOString(), serviceId: a.service.id };
        // If employee changed, include the new assignee (server enforces permissions)
        if (current.empId && current.empId !== a.employee?.id) {
          body.employeeId = current.empId;
        }
        await api.put(`/appointments/${a.id}`, body);
        setDragPreview(null);
        loadAppointments();
      } catch (err: any) {
        alert(`Failed to reschedule: ${err.response?.data?.error || err.message}`);
        setDragPreview(null);
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function loadAppointments() {
    setIsLoading(true);
    try {
      const endpoint = user?.role === 'ADMIN' ? '/appointments' : '/appointments/team';
      const response = await api.get(endpoint);
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const response = await api.get(user?.role === 'ADMIN' ? '/employees' : '/team/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }

  async function loadServices() {
    try {
      const response = await api.get('/categories');
      const allServices = response.data.flatMap((cat: any) => cat.services || []);
      setServices(allServices);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  async function loadMyServices() {
    try {
      const res = await api.get('/my/services');
      setServices(res.data);
    } catch (e) {
      console.error('Failed to load my services:', e);
    }
  }

  async function loadMyEmployee() {
    try {
      const res = await api.get('/me/employee');
      // Store my employee id into create form (used to lock employee selection for staff)
      setCreateForm((f) => ({ ...f, employeeId: String(res.data.id) }));
    } catch (e) {
      console.error('Failed to load my employee profile:', e);
    }
  }

  async function loadBlockServices() {
    try {
      const response = await api.get('/categories');
      const systemCat = (response.data || []).find((c: any) => c.name === 'System');
      setBlockServices(systemCat?.services || []);
    } catch (e) {
      console.error('Failed to load block services:', e);
    }
  }

  async function loadMyShifts() {
    try {
      const res = await api.get('/shifts/my');
      setMyShifts(res.data || []);
    } catch (e) {
      console.error('Failed to load my shifts:', e);
    }
  }

  function applyFilters() {
    let filtered = [...appointments];

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(appt => appt.status.toLowerCase() === filters.status.toLowerCase());
    }

    // Employee filter
    if (filters.employee) {
      filtered = filtered.filter(appt => appt.employee.id === Number(filters.employee));
    }

    // Date filter
    if (filters.date) {
      filtered = filtered.filter(appt => 
        new Date(appt.start).toDateString() === new Date(filters.date).toDateString()
      );
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(appt => 
        appt.clientName.toLowerCase().includes(searchLower) ||
        appt.service.name.toLowerCase().includes(searchLower) ||
        (appt.clientEmail && appt.clientEmail.toLowerCase().includes(searchLower))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

    setFilteredAppointments(filtered);
  }

  async function updateAppointmentStatus(appointmentId: number, newStatus: string) {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus.toUpperCase() });
      
      // Update local state
      setAppointments(prev => prev.map(appt => 
        appt.id === appointmentId ? { ...appt, status: newStatus.toUpperCase() } : appt
      ));
      
    } catch (error: any) {
      console.error('Failed to update appointment status:', error);
      alert(`Failed to update appointment status: ${error.response?.data?.error || error.message}`);
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  }

  function getStatusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-success';
      case 'pending': return 'bg-warning text-dark';
      case 'canceled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  function clearFilters() {
    setFilters({
      status: '',
      employee: '',
      date: '',
      search: ''
    });
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    
    if (!createForm.employeeId || !createForm.serviceId || !createForm.clientName || !createForm.date || !createForm.time) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const appointmentDateTime = new Date(`${createForm.date}T${createForm.time}`);
      
      // Staff and Admin create via authenticated endpoint; still compute ISO start
      await api.post('/appointments', {
        employeeId: Number(createForm.employeeId),
        serviceId: Number(createForm.serviceId),
        clientName: createForm.clientName,
        clientEmail: createForm.clientEmail,
        clientPhone: createForm.clientPhone,
        notes: createForm.notes,
        start: appointmentDateTime.toISOString()
      });
      
      setShowCreateModal(false);
      setCreateForm({
        employeeId: '',
        serviceId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        notes: '',
        date: '',
        time: ''
      });
      loadAppointments();
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      alert(`Failed to create appointment: ${error.response?.data?.error || error.message}`);
    }
  }

  async function handleAddMyShift(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!myShiftForm.date || !myShiftForm.startTime || !myShiftForm.endTime) return;
      await api.post('/shifts/my', {
        start: new Date(`${myShiftForm.date}T${myShiftForm.startTime}`).toISOString(),
        end: new Date(`${myShiftForm.date}T${myShiftForm.endTime}`).toISOString(),
      });
      setMyShiftForm({ date: '', startTime: '09:00', endTime: '17:00' });
      alert('Shift added');
      loadMyShifts();
    } catch (e: any) {
      alert(`Failed to add shift: ${e.response?.data?.error || e.message}`);
    }
  }

  async function handleBlockTime(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!blockForm.date || !blockForm.time || !blockForm.serviceId || !createForm.employeeId) return;
      const start = new Date(`${blockForm.date}T${blockForm.time}`).toISOString();
      await api.post('/appointments', {
        employeeId: Number(createForm.employeeId),
        serviceId: Number(blockForm.serviceId),
        clientName: 'BLOCKED',
        notes: 'Staff time block',
        start,
      });
      setBlockForm({ date: '', time: '', serviceId: '' });
      loadAppointments();
      alert('Time blocked');
    } catch (e: any) {
      alert(`Failed to block time: ${e.response?.data?.error || e.message}`);
    }
  }

  function openEditMyShift(s: {id:number; start:string; end:string}) {
    const d = new Date(s.start);
    const date = d.toISOString().split('T')[0];
    const startTime = d.toTimeString().slice(0,5);
    const endTime = new Date(s.end).toTimeString().slice(0,5);
    setEditMyShift({ id: s.id, date, startTime, endTime });
  }

  async function submitEditMyShift(e: React.FormEvent) {
    e.preventDefault();
    if (!editMyShift) return;
    try {
      await api.put(`/shifts/${editMyShift.id}`, {
        start: new Date(`${editMyShift.date}T${editMyShift.startTime}`).toISOString(),
        end: new Date(`${editMyShift.date}T${editMyShift.endTime}`).toISOString(),
      });
      setEditMyShift(null);
      loadMyShifts();
    } catch (err: any) {
      alert(`Failed to update shift: ${err.response?.data?.error || err.message}`);
    }
  }

  async function deleteMyShift(id: number) {
    if (!confirm('Delete this shift?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      loadMyShifts();
    } catch (err: any) {
      alert(`Failed to delete shift: ${err.response?.data?.error || err.message}`);
    }
  }

  function openReschedule(appt: Appointment) {
    const d = new Date(appt.start);
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().slice(0,5);
    setRescheduleForm({
      serviceId: String(appt.service.id),
      clientName: appt.clientName,
      clientEmail: appt.clientEmail || '',
      clientPhone: appt.clientPhone || '',
      notes: appt.notes || '',
      date,
      time,
    });
    setShowReschedule(appt);
  }

  async function submitReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!showReschedule) return;
    try {
      const start = new Date(`${rescheduleForm.date}T${rescheduleForm.time}`).toISOString();
      await api.put(`/appointments/${showReschedule.id}`, {
        start,
        serviceId: Number(rescheduleForm.serviceId),
        clientName: rescheduleForm.clientName,
        clientEmail: rescheduleForm.clientEmail,
        clientPhone: rescheduleForm.clientPhone,
        notes: rescheduleForm.notes,
      });
      setShowReschedule(null);
      loadAppointments();
    } catch (e: any) {
      alert(`Failed to reschedule: ${e.response?.data?.error || e.message}`);
    }
  }

  if (isLoading) {
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
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Appointments</h2>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-light text-dark">
            {filteredAppointments.length} of {appointments.length} appointments
          </span>
          <div className="btn-group">
            <button className={`btn btn-sm ${viewMode==='list' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=>setViewMode('list')} aria-label="List view"><i className="bi bi-list-ul me-1"/>List</button>
            <button className={`btn btn-sm ${viewMode==='calendar' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=>setViewMode('calendar')} aria-label="Calendar view"><i className="bi bi-calendar3 me-1"/>Calendar</button>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && (
            <div className="d-flex gap-2">
              <button 
                className="btn btn-success btn-sm"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-lg me-2"></i>Add Appointment
              </button>
              {user?.role === 'ADMIN' && (
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => window.location.href = '/booking'}
              >
                <i className="bi bi-calendar-plus me-2"></i>Public Booking
              </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters below the title (collapsed by default) */}
      <div className="card mb-3 sticky-subheader">
        <div className="card-header d-flex justify-content-between align-items-center py-2">
          <strong>Filters</strong>
          <button
            className={`btn btn-sm ${showFilters ? 'btn-outline-secondary' : 'btn-primary'}`}
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters ? 'true' : 'false'}
            aria-controls="appointments-filters"
          >
            {showFilters ? (<><i className="bi bi-chevron-up me-1"/>Hide</>) : (<><i className="bi bi-funnel me-1"/>Show Filters</>)}
          </button>
        </div>
        {showFilters && (
        <div id="appointments-filters" className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Client name, service, email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            {(user?.role === 'ADMIN' || user?.role === 'EMPLOYEE') && (
              <div className="col-md-3">
                <label className="form-label">Employee</label>
                <select
                  className="form-select"
                  value={filters.employee}
                  onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                  aria-label="Filter by employee"
                >
                  <option value="">{user?.role==='EMPLOYEE' ? 'All Team Members' : 'All Employees'}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-md-2">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                aria-label="Filter by date"
              />
            </div>
            <div className="col-md-2 d-flex">
              <button className="btn btn-outline-secondary mt-auto" onClick={clearFilters} aria-label="Clear filters">
                <i className="bi bi-x-circle me-1"></i>Clear Filters
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {viewMode === 'calendar' && (
        <div className="card mb-3">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div className="btn-group">
              {calendarMode === 'day' ? (
                <>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(calendarDate); d.setDate(d.getDate()-1); setCalendarDate(d.toISOString().slice(0,10)); }} aria-label="Previous day"><i className="bi bi-chevron-left"/></button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=> setCalendarDate(new Date().toISOString().slice(0,10))} aria-label="Today">Today</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(calendarDate); d.setDate(d.getDate()+1); setCalendarDate(d.toISOString().slice(0,10)); }} aria-label="Next day"><i className="bi bi-chevron-right"/></button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=getWeekStart(new Date(calendarDate)); d.setDate(d.getDate()-7); setCalendarDate(d.toISOString().slice(0,10)); }} aria-label="Previous week"><i className="bi bi-chevron-left"/></button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=> { const d=getWeekStart(new Date()); setCalendarDate(d.toISOString().slice(0,10)); }} aria-label="This week">This Week</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=getWeekStart(new Date(calendarDate)); d.setDate(d.getDate()+7); setCalendarDate(d.toISOString().slice(0,10)); }} aria-label="Next week"><i className="bi bi-chevron-right"/></button>
                </>
              )}
            </div>
            <div className="btn-group">
              <button className={`btn btn-sm ${calendarMode==='day' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=> setCalendarMode('day')} aria-label="Day">Day</button>
              <button className={`btn btn-sm ${calendarMode==='week' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={()=> setCalendarMode('week')} aria-label="Week">Week</button>
            </div>
            <h6 className="mb-0">
              {calendarMode==='day' ? (
                new Date(calendarDate).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric'})
              ) : (
                (()=>{ const s=getWeekStart(new Date(calendarDate)); const e=new Date(s); e.setDate(s.getDate()+6); return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`; })()
              )}
            </h6>
            <div className="w-150"></div>
          </div>
        </div>
      )}

      

      {/* Staff quick tools removed; now on its own page: My Availability */}

      {/* Calendar View */}
      {viewMode === 'calendar' ? (
        <div className="apt-calendar card">
          <div className="card-body p-0">
            {calendarMode === 'day' ? (
              <>
                <div className="apt-cal-header d-flex">
                  <div className="apt-time-col flex-shrink-0" aria-hidden="true"></div>
                  <div className="flex-grow-1 d-flex">
                    {calendarEmployees.length === 0 ? (
                      <div className="text-muted p-3">No team members to show</div>
                    ) : (
                      calendarEmployees.map((emp:any)=> (
                        <div key={emp.id} className="apt-col-head text-center p-2 border-start">
                          <div className="d-inline-flex align-items-center justify-content-center gap-2">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt={`${emp.firstName} ${emp.lastName}`} className="rounded-circle avatar-sm" />
                            ) : (
                              <div className="rounded-circle d-inline-flex align-items-center justify-content-center bg-secondary text-white avatar-sm-initials">
                                {emp.firstName?.[0] || ''}{emp.lastName?.[0] || ''}
                              </div>
                            )}
                            <div className="fw-medium">{emp.firstName} {emp.lastName}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="apt-cal-body d-flex position-relative">
                  {/* Time labels */}
                  <div className="apt-time-col flex-shrink-0 border-top">
                    {Array.from({length:(CAL_END_H-CAL_START_H)}).map((_,i)=>{
                      const h = CAL_START_H + i;
                      const label = new Date(0,0,0,h).toLocaleTimeString([], { hour:'numeric' });
                      return (
                        <div key={h} className="apt-time-slot border-bottom small text-muted">{label}</div>
                      );
                    })}
                  </div>
                  {/* Now line + time label */}
                  {(() => {
                    // force re-evaluation when nowTick changes
                    void nowTick;
                    const todayYMD = toYMDLocal(new Date());
                    if (todayYMD === calendarDate) {
                      const now = new Date();
                      const mins = minutesSince(CAL_START_H, now);
                      if (mins >= 0 && mins <= CAL_TOTAL_MIN) {
                        const q = Math.max(0, Math.min(48, Math.round(mins / 15)));
                        const label = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        return (
                          <>
                            <div className={`apt-nowline top-q-${q}`} />
                            <div className={`apt-nowtime top-q-${q}`}>
                              <span className="apt-nowpill">{label}</span>
                            </div>
                          </>
                        );
                      }
                    }
                    return null;
                  })()}
                  {/* Employee columns */}
                  <div className="flex-grow-1 d-flex border-start">
                    {calendarEmployees.map((emp:any)=>{
                      const laid = layoutOverlaps(dayApptsByEmp[emp.id] || []);
                      const isReadOnlyCol = user?.role === 'EMPLOYEE' && Number(createForm.employeeId || 0) !== emp.id;
                      return (
                        <div key={emp.id} className={`apt-col position-relative border-start ${isReadOnlyCol ? 'apt-col-readonly' : ''}`} data-emp-id={emp.id} data-day={calendarDate} title={isReadOnlyCol ? 'Read-only: you can only create in your own column' : undefined} onDoubleClick={(e)=>{
                          // Staff can only create in their own column
                          if (user?.role === 'EMPLOYEE') {
                            const myId = Number(createForm.employeeId || 0);
                            if (emp.id !== myId) return;
                          }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const y = e.clientY - rect.top;
                          const mins = Math.max(0, Math.min(CAL_TOTAL_MIN, (y / rect.height) * CAL_TOTAL_MIN));
                          const minutesRounded = Math.floor(mins / 15) * 15; // 15-min granularity
                          const dt = new Date(calendarDate + 'T00:00:00');
                          dt.setHours(CAL_START_H, 0, 0, 0);
                          dt.setMinutes(dt.getMinutes() + minutesRounded);
                          // Prefill create form
                          setCreateForm((f)=>({ ...f, employeeId: String(emp.id), date: calendarDate, time: dt.toTimeString().slice(0,5) }));
                          setShowCreateModal(true);
                        }} aria-label={`Column for ${emp.firstName} ${emp.lastName}`}>
                          {/* Hour grid lines */}
                          {Array.from({length:(CAL_END_H-CAL_START_H)}).map((_,i)=> (
                            <div key={i} className="apt-col-hour border-bottom" aria-hidden="true"></div>
                          ))}
                          {/* Events with overlap layout */}
                          {laid.map(({appt: a, colIndex, colCount}) => {
                            const start = new Date(a.start);
                            const end = new Date(a.end);
                            const startM = minutesSince(CAL_START_H, start);
                            const durM = Math.max(15, (end.getTime()-start.getTime())/60000);
                            const startQ = Math.max(0, Math.min(48, Math.round(startM/15)));
                            let durQ = Math.max(1, Math.round(durM/15));
                            if (startQ + durQ > 48) durQ = 48 - startQ;
                            const isBlocked = a.clientName?.toUpperCase() === 'BLOCKED';
                            const wl = widthLeftClasses(colIndex, colCount);
                            const svc = isBlocked ? '' : svcColorClass(a);
                            const dragging = dragPreview && dragPreview.id === a.id; // preview any mode
                            const topClass = dragging ? `top-q-${dragPreview!.startQ}` : `top-q-${startQ}`;
                            const hClass = `h-q-${durQ}`;
                            // Compute display times; during drag, use preview position
                            let dispStart = start;
                            let dispEnd = end;
                            if (dragging) {
                              const dayYMD = dragPreview!.day || calendarDate;
                              const previewStart = new Date(dayYMD + 'T00:00:00');
                              previewStart.setHours(CAL_START_H, 0, 0, 0);
                              previewStart.setMinutes(previewStart.getMinutes() + dragPreview!.startQ * 15);
                              const previewEnd = new Date(previewStart);
                              previewEnd.setMinutes(previewEnd.getMinutes() + durQ * 15);
                              dispStart = previewStart;
                              dispEnd = previewEnd;
                            }
                            const canEdit = user?.role === 'ADMIN' || (user?.role === 'EMPLOYEE' && a.employee?.id === Number(createForm.employeeId || 0));
                            return (
                              <div key={a.id} className={`apt-event has-icons ${isBlocked ? 'apt-event-blocked' : 'apt-event-booked'} ${svc} ${topClass} ${hClass} ${wl} ${dragging ? 'drag-preview apt-dragging' : ''} ${!canEdit ? 'apt-event-readonly' : ''}`}
                                title={!canEdit ? 'Read-only: you can only edit your own appointments' : undefined}
                                onMouseDown={canEdit ? (ev)=> onStartDrag(ev, a) : undefined}>
                                {dragging && (
                                  <div className="apt-destbadge">
                                    {(() => {
                                      const targetEmp = calendarEmployees.find((e:any)=> e.id === dragPreview!.empId);
                                      const dayLabel = (dragPreview!.day || calendarDate);
                                      const empName = targetEmp ? `${targetEmp.firstName} ${targetEmp.lastName}` : '';
                                      return `${empName}${empName ? ' · ' : ''}${new Date(dayLabel).toLocaleDateString([], { month:'short', day:'numeric'})}`;
                                    })()}
                                  </div>
                                )}
                                <div className="apt-icons">
                                  <button className="btn btn-xs btn-ico-outline" onClick={(e)=>{ e.stopPropagation(); setShowDetails(a); }} aria-label="View details"><i className="bi bi-eye"/></button>
                                  {canEdit && <button className="btn btn-xs btn-ico" onClick={(e)=>{ e.stopPropagation(); openReschedule(a); }} aria-label="Update appointment"><i className="bi bi-pencil"/></button>}
                                </div>
                                <div className="apt-main small">
                                  <span className="apt-time fw-medium">{dispStart.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} - {dispEnd.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>
                                  {!isBlocked && <span className="apt-sep"> · </span>}
                                  <span className="apt-client">{isBlocked ? 'Blocked time' : a.clientName}</span>
                                </div>
                                {!isBlocked && (
                                  <div className="apt-service small text-muted">{a.service?.name}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              // Week mode: 7 day columns for selected employee
              <>
                <div className="apt-cal-header d-flex">
                  <div className="apt-time-col flex-shrink-0" aria-hidden="true"></div>
                  <div className="flex-grow-1 d-flex">
                    {weekDays.map((d)=> (
                      <div key={d} className="apt-col-head text-center p-2 border-start">
                        <div className="fw-medium">{new Date(d).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric'})}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="apt-cal-body d-flex position-relative">
                  <div className="apt-time-col flex-shrink-0 border-top">
                    {Array.from({length:(CAL_END_H-CAL_START_H)}).map((_,i)=>{
                      const h = CAL_START_H + i;
                      const label = new Date(0,0,0,h).toLocaleTimeString([], { hour:'numeric' });
                      return (
                        <div key={h} className="apt-time-slot border-bottom small text-muted">{label}</div>
                      );
                    })}
                  </div>
                  <div className="flex-grow-1 d-flex border-start">
                    {(() => {
                      // Determine employee to render
                      let empId: number | null = null;
                      if (filters.employee) {
                        empId = Number(filters.employee);
                      } else if (user?.role === 'EMPLOYEE') {
                        // Fallback to my own id
                        empId = Number(createForm.employeeId || 0);
                        // If still not available, use the first team member
                        if (!empId && employees.length > 0) empId = employees[0].id;
                      } else if (user?.role === 'ADMIN') {
                        if (employees.length > 0) empId = employees[0].id;
                      }
                      if (!empId) {
                        return (
                          <div className="p-3 text-muted">{user?.role==='ADMIN' ? 'Select an employee to show week view' : 'No employee profile loaded'}</div>
                        );
                      }
                      return weekDays.map((dayYMD) => {
                        const dayEvents = appointments.filter(a => a.employee?.id === empId && isSameDayISO(a.start, dayYMD));
                        const laid = layoutOverlaps(dayEvents);
                        const isReadOnlyCol = user?.role === 'EMPLOYEE' && Number(createForm.employeeId || 0) !== empId;
                        return (
                          <div key={dayYMD} className={`apt-col position-relative border-start ${isReadOnlyCol ? 'apt-col-readonly' : ''}`} data-emp-id={empId} data-day={dayYMD} title={isReadOnlyCol ? 'Read-only: you can only create in your own column' : undefined} onDoubleClick={(e)=>{
                            // Staff can only create in their own week column (their employee id)
                            if (user?.role === 'EMPLOYEE') {
                              const myId = Number(createForm.employeeId || 0);
                              if (empId !== myId) return;
                            }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const mins = Math.max(0, Math.min(CAL_TOTAL_MIN, (y / rect.height) * CAL_TOTAL_MIN));
                            const minutesRounded = Math.floor(mins / 15) * 15;
                            const dt = new Date(dayYMD + 'T00:00:00');
                            dt.setHours(CAL_START_H, 0, 0, 0);
                            dt.setMinutes(dt.getMinutes() + minutesRounded);
                            setCreateForm((f)=>({ ...f, employeeId: String(empId), date: dayYMD, time: dt.toTimeString().slice(0,5) }));
                            setShowCreateModal(true);
                          }} aria-label={`Column for ${new Date(dayYMD).toDateString()}`}>
                            {Array.from({length:(CAL_END_H-CAL_START_H)}).map((_,i)=> (
                              <div key={i} className="apt-col-hour border-bottom" aria-hidden="true"></div>
                            ))}
                            {laid.map(({appt: a, colIndex, colCount}) => {
                              const start = new Date(a.start);
                              const end = new Date(a.end);
                              const startM = minutesSince(CAL_START_H, start);
                              const durM = Math.max(15, (end.getTime()-start.getTime())/60000);
                              const startQ = Math.max(0, Math.min(48, Math.round(startM/15)));
                              let durQ = Math.max(1, Math.round(durM/15));
                              if (startQ + durQ > 48) durQ = 48 - startQ;
                              const isBlocked = a.clientName?.toUpperCase() === 'BLOCKED';
                              const wl = widthLeftClasses(colIndex, colCount);
                              const svc = isBlocked ? '' : svcColorClass(a);
                              const dragging = dragPreview && dragPreview.id === a.id;
                              const topClass = dragging ? `top-q-${dragPreview!.startQ}` : `top-q-${startQ}`;
                              const hClass = `h-q-${durQ}`;
                              let dispStart = start;
                              let dispEnd = end;
                              if (dragging) {
                                const dayForPreview = dragPreview!.day || dayYMD;
                                const previewStart = new Date(dayForPreview + 'T00:00:00');
                                previewStart.setHours(CAL_START_H, 0, 0, 0);
                                previewStart.setMinutes(previewStart.getMinutes() + dragPreview!.startQ * 15);
                                const previewEnd = new Date(previewStart);
                                previewEnd.setMinutes(previewEnd.getMinutes() + durQ * 15);
                                dispStart = previewStart;
                                dispEnd = previewEnd;
                              }
                              const canEdit = user?.role === 'ADMIN' || (user?.role === 'EMPLOYEE' && a.employee?.id === Number(createForm.employeeId || 0));
                              return (
                                <div key={a.id} className={`apt-event has-icons ${isBlocked ? 'apt-event-blocked' : 'apt-event-booked'} ${svc} ${topClass} ${hClass} ${wl} ${dragging ? 'drag-preview apt-dragging' : ''} ${!canEdit ? 'apt-event-readonly' : ''}`}
                                  title={!canEdit ? 'Read-only: you can only edit your own appointments' : undefined}
                                  onMouseDown={canEdit ? (ev)=> onStartDrag(ev, a, dayYMD, empId!) : undefined}>
                                  {dragging && (
                                    <div className="apt-destbadge">
                                      {(() => {
                                        const targetEmp = employees.find((e:any)=> e.id === dragPreview!.empId);
                                        const dayLabel = (dragPreview!.day || dayYMD);
                                        const empName = targetEmp ? `${targetEmp.firstName} ${targetEmp.lastName}` : '';
                                        return `${empName}${empName ? ' · ' : ''}${new Date(dayLabel).toLocaleDateString([], { month:'short', day:'numeric'})}`;
                                      })()}
                                    </div>
                                  )}
                                  <div className="apt-icons">
                                    <button className="btn btn-xs btn-ico-outline" onClick={(e)=>{ e.stopPropagation(); setShowDetails(a); }} aria-label="View details"><i className="bi bi-eye"/></button>
                                    {canEdit && <button className="btn btn-xs btn-ico" onClick={(e)=>{ e.stopPropagation(); openReschedule(a); }} aria-label="Update appointment"><i className="bi bi-pencil"/></button>}
                                  </div>
                                  <div className="apt-main small">
                                    <span className="apt-time fw-medium">{dispStart.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} - {dispEnd.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>
                                    {!isBlocked && <span className="apt-sep"> · </span>}
                                    <span className="apt-client">{isBlocked ? 'Blocked time' : a.clientName}</span>
                                  </div>
                                  {!isBlocked && (
                                    <div className="apt-service small text-muted">{a.service?.name}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Appointments List */}
      {viewMode === 'list' && (filteredAppointments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <i className="bi bi-calendar-x display-1 text-muted mb-3"></i>
            <h5 className="text-muted">No appointments found</h5>
            <p className="text-muted">Try adjusting your filters or create a new appointment</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                {user?.role === 'ADMIN' && <th>Employee</th>}
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Status</th>
                <th className="w-150">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment) => {
                const { date, time } = formatDateTime(appointment.start);
                const endTime = formatDateTime(appointment.end).time;
                return (
                  <tr key={appointment.id}>
                    <td>
                      <div>
                        <div className="fw-medium">{appointment.clientName}</div>
                        <div className="d-flex flex-column">
                          {appointment.clientEmail && (
                            <small className="text-muted">
                              <a href={`mailto:${appointment.clientEmail}`}>{appointment.clientEmail}</a>
                            </small>
                          )}
                          {appointment.clientPhone && (
                            <small className="text-muted">
                              <a href={`tel:${appointment.clientPhone}`}>{appointment.clientPhone}</a>
                            </small>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{appointment.service.name}</td>
                    {user?.role === 'ADMIN' && (
                      <td>{appointment.employee.firstName} {appointment.employee.lastName}</td>
                    )}
                    <td>
                      <div>
                        <div>{date}</div>
                        <small className="text-muted">{time} - {endTime}</small>
                      </div>
                    </td>
                    <td>{appointment.service.durationMin} min</td>
                    <td className="fw-medium">${(appointment.service.priceCents / 100).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td>
                      <div className="dropdown">
                        <button 
                          className="btn btn-sm btn-outline-secondary dropdown-toggle"
                          data-bs-toggle="dropdown"
                          aria-label="Open actions menu"
                        >
                          Actions
                        </button>
                        <ul className="dropdown-menu">
                          <li>
                            <button 
                              className="dropdown-item"
                              onClick={() => setShowDetails(appointment)}
                            >
                              <i className="bi bi-eye me-2"></i>View Details
                            </button>
                          </li>
                          <li>
                            <button 
                              className="dropdown-item"
                              onClick={() => openReschedule(appointment)}
                            >
                              <i className="bi bi-arrow-repeat me-2"></i>Reschedule
                            </button>
                          </li>
                          {appointment.status !== 'confirmed' && (
                            <li>
                              <button 
                                className="dropdown-item"
                                onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                              >
                                <i className="bi bi-check-circle me-2"></i>Confirm
                              </button>
                            </li>
                          )}
                          {appointment.status !== 'canceled' && (
                            <li>
                              <button 
                                className="dropdown-item text-danger"
                                onClick={() => updateAppointmentStatus(appointment.id, 'canceled')}
                              >
                                <i className="bi bi-x-circle me-2"></i>Cancel
                              </button>
                            </li>
                          )}
                        </ul>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
  ))}

      {/* Appointment Details Modal */}
      {showDetails && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Appointment Details</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowDetails(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Client Name:</div>
                  <div className="col-sm-8">{showDetails.clientName}</div>
                </div>
                
                {showDetails.clientEmail && (
                  <div className="row mb-3">
                    <div className="col-sm-4 fw-medium">Email:</div>
                    <div className="col-sm-8">{showDetails.clientEmail}</div>
                  </div>
                )}
                
                {showDetails.clientPhone && (
                  <div className="row mb-3">
                    <div className="col-sm-4 fw-medium">Phone:</div>
                    <div className="col-sm-8">{showDetails.clientPhone}</div>
                  </div>
                )}
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Service:</div>
                  <div className="col-sm-8">{showDetails.service.name}</div>
                </div>
                
                {user?.role === 'ADMIN' && (
                  <div className="row mb-3">
                    <div className="col-sm-4 fw-medium">Employee:</div>
                    <div className="col-sm-8">{showDetails.employee.firstName} {showDetails.employee.lastName}</div>
                  </div>
                )}
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Date & Time:</div>
                  <div className="col-sm-8">
                    {formatDateTime(showDetails.start).date} at {formatDateTime(showDetails.start).time}
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Duration:</div>
                  <div className="col-sm-8">{showDetails.service.durationMin} minutes</div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Price:</div>
                  <div className="col-sm-8 fw-medium">${(showDetails.service.priceCents / 100).toFixed(2)}</div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Status:</div>
                  <div className="col-sm-8">
                    <span className={`badge ${getStatusBadgeClass(showDetails.status)}`}>
                      {showDetails.status}
                    </span>
                  </div>
                </div>
                
                {showDetails.notes && (
                  <div className="row mb-3">
                    <div className="col-sm-4 fw-medium">Notes:</div>
                    <div className="col-sm-8">{showDetails.notes}</div>
                  </div>
                )}
                
                <div className="row mb-3">
                  <div className="col-sm-4 fw-medium">Booked:</div>
                  <div className="col-sm-8">{new Date(showDetails.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowDetails(null)}
                  aria-label="Close"
                >
                  Close
                </button>
                {showDetails.status !== 'confirmed' && (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={() => {
                      updateAppointmentStatus(showDetails.id, 'confirmed');
                      setShowDetails(null);
                    }}
                  >
                    Confirm Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <form onSubmit={handleCreateAppointment}>
                <div className="modal-header">
                  <h5 className="modal-title">Create New Appointment</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowCreateModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Employee *</label>
                      {user?.role === 'ADMIN' ? (
                        <select 
                          className="form-select"
                          value={createForm.employeeId}
                          onChange={(e) => setCreateForm({...createForm, employeeId: e.target.value})}
                          required
                          aria-label="Select employee"
                        >
                          <option value="">Select Employee</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          value="Yourself"
                          disabled
                          aria-label="Employee"
                        />
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Service *</label>
                      <select 
                        className="form-select"
                        value={createForm.serviceId}
                        onChange={(e) => setCreateForm({...createForm, serviceId: e.target.value})}
                        required
                        aria-label="Select service"
                      >
                        <option value="">Select Service</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} - ${(service.priceCents / 100).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Client Name *</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={createForm.clientName}
                        onChange={(e) => setCreateForm({...createForm, clientName: e.target.value})}
                        required
                        placeholder="Client full name"
                        aria-label="Client name"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Client Email</label>
                      <input 
                        type="email"
                        className="form-control"
                        value={createForm.clientEmail}
                        onChange={(e) => setCreateForm({...createForm, clientEmail: e.target.value})}
                        placeholder="client@example.com"
                        aria-label="Client email"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Client Phone</label>
                      <input 
                        type="tel"
                        className="form-control"
                        value={createForm.clientPhone}
                        onChange={(e) => setCreateForm({...createForm, clientPhone: e.target.value})}
                        placeholder="(555) 123-4567"
                        aria-label="Client phone"
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Date *</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={createForm.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setCreateForm({...createForm, date: e.target.value})}
                        required
                        aria-label="Date"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Time *</label>
                      <input 
                        type="time"
                        className="form-control"
                        value={createForm.time}
                        onChange={(e) => setCreateForm({...createForm, time: e.target.value})}
                        required
                        aria-label="Time"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={createForm.notes}
                      onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                      placeholder="Any special requests or notes..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                    aria-label="Close"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={submitReschedule}>
                <div className="modal-header">
                  <h5 className="modal-title">Reschedule Appointment</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowReschedule(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Service</label>
                    <select className="form-select" value={rescheduleForm.serviceId} onChange={(e)=>setRescheduleForm({...rescheduleForm, serviceId: e.target.value})} aria-label="Service">
                      {services.map((s:any)=>(
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-control" value={rescheduleForm.date} onChange={(e)=>setRescheduleForm({...rescheduleForm, date: e.target.value})} aria-label="Date" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Time</label>
                      <input type="time" className="form-control" value={rescheduleForm.time} onChange={(e)=>setRescheduleForm({...rescheduleForm, time: e.target.value})} aria-label="Time" />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label">Client Name</label>
                      <input type="text" className="form-control" value={rescheduleForm.clientName} onChange={(e)=>setRescheduleForm({...rescheduleForm, clientName: e.target.value})} aria-label="Client name" />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Client Phone</label>
                      <input type="tel" className="form-control" value={rescheduleForm.clientPhone} onChange={(e)=>setRescheduleForm({...rescheduleForm, clientPhone: e.target.value})} aria-label="Client phone" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Client Email</label>
                      <input type="email" className="form-control" value={rescheduleForm.clientEmail} onChange={(e)=>setRescheduleForm({...rescheduleForm, clientEmail: e.target.value})} aria-label="Client email" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows={3} value={rescheduleForm.notes} onChange={(e)=>setRescheduleForm({...rescheduleForm, notes: e.target.value})} aria-label="Notes" />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReschedule(null)} aria-label="Close">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit My Shift Modal */}
      {editMyShift && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={submitEditMyShift}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Shift</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={()=>setEditMyShift(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label" htmlFor="edit-shift-date">Date</label>
                      <input id="edit-shift-date" type="date" className="form-control" value={editMyShift.date} onChange={(e)=>setEditMyShift({...editMyShift, date: e.target.value})} aria-label="Date"/>
                    </div>
                    <div className="col-3">
                      <label className="form-label" htmlFor="edit-shift-start">Start</label>
                      <input id="edit-shift-start" type="time" className="form-control" value={editMyShift.startTime} onChange={(e)=>setEditMyShift({...editMyShift, startTime: e.target.value})} aria-label="Start time"/>
                    </div>
                    <div className="col-3">
                      <label className="form-label" htmlFor="edit-shift-end">End</label>
                      <input id="edit-shift-end" type="time" className="form-control" value={editMyShift.endTime} onChange={(e)=>setEditMyShift({...editMyShift, endTime: e.target.value})} aria-label="End time"/>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setEditMyShift(null)} aria-label="Close">Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
