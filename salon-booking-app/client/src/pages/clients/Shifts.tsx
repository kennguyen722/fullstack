import { useEffect, useMemo, useState } from 'react';
import { api } from '../../shared/api';

interface Shift {
  id: number;
  employeeId: number;
  start: string;
  end: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<number | ''>('');
  const [startFilter, setStartFilter] = useState<string>('');
  const [endFilter, setEndFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    employeeId: 0,
    date: '',
    startTime: '09:00',
    endTime: '18:00'
  });
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('list');
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [weekCursor, setWeekCursor] = useState(() => {
    const d = new Date();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    sunday.setHours(0,0,0,0);
    return sunday;
  });
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Weekly availability template (admin bulk)
  const [bulkWeeks, setBulkWeeks] = useState(4);
  const [bulkStartDate, setBulkStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weekTemplate, setWeekTemplate] = useState([
    { day: 1, startTime: '', endTime: '' }, // Mon
    { day: 2, startTime: '', endTime: '' }, // Tue
    { day: 3, startTime: '', endTime: '' }, // Wed
    { day: 4, startTime: '', endTime: '' }, // Thu
    { day: 5, startTime: '', endTime: '' }, // Fri
    { day: 6, startTime: '', endTime: '' }, // Sat
    { day: 7, startTime: '', endTime: '' }, // Sun
  ]);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [employeeFilter]);

  async function loadShifts(overrides?: { employeeId?: number | ''; start?: string; end?: string }) {
    try {
      const params: any = {};
      const ef = overrides?.employeeId ?? employeeFilter;
      const sf = overrides?.start ?? startFilter;
      const ef2 = overrides?.end ?? endFilter;
      if (ef) params.employeeId = ef;
      if (sf) params.start = sf;
      if (ef2) params.end = ef2;
      const query = new URLSearchParams(params).toString();
      const response = await api.get(`/shifts${query ? `?${query}` : ''}`);
      setShifts(response.data);
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
  }

  async function loadEmployees() {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }

  function openModal(shift?: Shift) {
    if (shift) {
      setEditingShift(shift);
      const start = new Date(shift.start);
      const end = new Date(shift.end);
      const date = start.toISOString().split('T')[0];
      const startTime = start.toTimeString().slice(0, 5);
      const endTime = end.toTimeString().slice(0, 5);
      
      setFormData({
        employeeId: shift.employeeId,
        date,
        startTime,
        endTime
      });
    } else {
      setEditingShift(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setFormData({
        employeeId: employees[0]?.id || 0,
        date: tomorrow.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '18:00'
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      
      const shiftData = {
        employeeId: formData.employeeId,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      };

      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, shiftData);
      } else {
        await api.post('/shifts', shiftData);
      }
      setShowModal(false);
      loadShifts();
    } catch (error) {
      console.error('Failed to save shift:', error);
    }
  }

  async function deleteShift(shiftId: number) {
    if (confirm('Are you sure you want to delete this shift?')) {
      try {
        await api.delete(`/shifts/${shiftId}`);
        loadShifts();
      } catch (error) {
        console.error('Failed to delete shift:', error);
      }
    }
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function fmtDateYYYYMMDD(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getWeekBounds(base: Date) {
    const start = new Date(base);
    // Ensure it's Sunday
    start.setDate(base.getDate() - base.getDay());
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    end.setHours(0,0,0,0);
    return { start, end };
  }

  // Export helpers
  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const header = ['Employee','Start','End','DurationHours'];
    const rows = shifts.map((s) => {
      const start = new Date(s.start);
      const end = new Date(s.end);
      const dur = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const emp = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : `Employee #${s.employeeId}`;
      return [emp, start.toISOString(), end.toISOString(), dur.toFixed(2)];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const ts = new Date();
    const tsLabel = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;
    download(`shifts_${tsLabel}.csv`, csv, 'text/csv;charset=utf-8;');
  }

  function icsDate(d: Date) {
    const iso = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    // iso is like 20250101T123000Z already
    return iso;
  }

  function exportICS() {
    const now = new Date();
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//SalonBooking//Shifts//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    for (const s of shifts) {
      const start = new Date(s.start);
      const end = new Date(s.end);
      const emp = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : `Employee #${s.employeeId}`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:shift-${s.id}@salon.local`);
      lines.push(`DTSTAMP:${icsDate(now)}`);
      lines.push(`DTSTART:${icsDate(start)}`);
      lines.push(`DTEND:${icsDate(end)}`);
      lines.push(`SUMMARY:Shift - ${emp}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const content = lines.join('\r\n');
    const ts = new Date();
    const tsLabel = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;
    download(`shifts_${tsLabel}.ics`, content, 'text/calendar;charset=utf-8;');
  }

  function groupShiftsByWeek() {
    const groups: { [key: string]: Shift[] } = {};
    
    shifts.forEach(shift => {
      const date = new Date(shift.start);
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const weekKey = startOfWeek.toISOString().split('T')[0];
      
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(shift);
    });
    
    return groups;
  }

  const weeklyShifts = groupShiftsByWeek();

  // Month view helpers
  const monthDays = useMemo(() => {
    const start = new Date(monthCursor);
    const year = start.getFullYear();
    const month = start.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days: Date[] = [];
    // Fill leading days to start on Sunday
    const lead = first.getDay();
    for (let i = 0; i < lead; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() - (lead - i));
      days.push(d);
    }
    // Current month days
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    // Trailing days to complete 6 rows of 7
    while (days.length % 7 !== 0 || days.length < 42) {
      const d = new Date(days[days.length - 1]);
      d.setDate(d.getDate() + 1);
      days.push(d);
    }
    return days;
  }, [monthCursor]);

  function sameDay(a: Date, b: Date) {
    return a.toDateString() === b.toDateString();
  }

  function openQuickAddForDate(date: Date) {
    setEditingShift(null);
    setFormData({
      employeeId: employeeFilter && typeof employeeFilter === 'number' ? employeeFilter : (employees[0]?.id || 0),
      date: date.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00'
    });
    setShowModal(true);
  }

  function openDayDetails(date: Date) {
    setSelectedDay(date);
    setShowDayModal(true);
  }

  // Auto-apply month date window when in Month view or navigating months
  useEffect(() => {
    if (viewMode !== 'month') return;
    const first = new Date(monthCursor);
    first.setDate(1);
    const nextFirst = new Date(first);
    nextFirst.setMonth(first.getMonth() + 1);
    const s = fmtDateYYYYMMDD(first);
    const e = fmtDateYYYYMMDD(nextFirst);
    const needsUpdate = startFilter !== s || endFilter !== e;
    if (needsUpdate) {
      setStartFilter(s);
      setEndFilter(e);
      // Fetch immediately with overrides to avoid waiting for state to settle
      loadShifts({ start: s, end: e });
    } else {
      // Filters already match month; still reload to reflect employee filter changes
      loadShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, monthCursor, employeeFilter]);

  // Auto-apply week date window when in Week view or navigating weeks
  useEffect(() => {
    if (viewMode !== 'week') return;
    const { start, end } = getWeekBounds(weekCursor);
    const s = fmtDateYYYYMMDD(start);
    const e = fmtDateYYYYMMDD(end);
    const needsUpdate = startFilter !== s || endFilter !== e;
    if (needsUpdate) {
      setStartFilter(s);
      setEndFilter(e);
      loadShifts({ start: s, end: e });
    } else {
      loadShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, weekCursor, employeeFilter]);

  // Lock body scroll and avoid layout shift when any modal is open
  useEffect(() => {
    const anyOpen = showModal || showDayModal;
    const body = document.body;
    if (anyOpen) {
      body.classList.add('modal-open');
    } else {
      body.classList.remove('modal-open');
    }
    return () => {
      body.classList.remove('modal-open');
    };
  }, [showModal, showDayModal]);

  return (
    <div>
      <div className="mb-2">
        <h2 className="mb-2">Shifts</h2>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="d-inline-flex align-items-center gap-2 me-2">
            <label className="form-label mb-0" htmlFor="filter-employee">Employee</label>
            <select id="filter-employee" className="form-select form-select-sm w-auto" value={employeeFilter}
              onChange={(e)=> setEmployeeFilter(e.target.value ? Number(e.target.value) : '')} aria-label="Filter by employee">
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
          <div className="d-inline-flex align-items-center gap-2 me-2">
            <label className="form-label mb-0" htmlFor="filter-start">Start</label>
            <input id="filter-start" type="date" className="form-control form-control-sm w-auto" value={startFilter} onChange={(e)=> setStartFilter(e.target.value)} />
            <label className="form-label mb-0" htmlFor="filter-end">End</label>
            <input id="filter-end" type="date" className="form-control form-control-sm w-auto" value={endFilter} onChange={(e)=> setEndFilter(e.target.value)} />
            <button className="btn btn-sm btn-outline-secondary" onClick={()=> loadShifts()} aria-label="Apply date filter">Apply</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={()=>{ setStartFilter(''); setEndFilter(''); setTimeout(()=>loadShifts(), 0); }} aria-label="Clear date filter">Clear</button>
          </div>
          <div className="btn-group me-2">
            <button 
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('list')}
            >
              <i className="bi bi-list-ul me-1"/>List
            </button>
            <button 
              className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('week')}
            >
              <i className="bi bi-calendar3 me-1"/>Week View
            </button>
            <button 
              className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('month')}
            >
              <i className="bi bi-calendar-month me-1"/>Month
            </button>
          </div>
          <div className="btn-group me-2">
            <button className="btn btn-outline-secondary" onClick={()=>{
              const today = new Date();
              const { start, end } = getWeekBounds(today);
              setWeekCursor(start);
              setStartFilter(fmtDateYYYYMMDD(start));
              setEndFilter(fmtDateYYYYMMDD(end));
              loadShifts({ start: fmtDateYYYYMMDD(start), end: fmtDateYYYYMMDD(end) });
            }} aria-label="This week"><i className="bi bi-calendar-week me-1"/>This Week</button>
            <button className="btn btn-outline-secondary" onClick={()=>{
              const today = new Date();
              const first = new Date(today.getFullYear(), today.getMonth(), 1);
              const nextFirst = new Date(first.getFullYear(), first.getMonth()+1, 1);
              setViewMode('month');
              setMonthCursor(first);
              const s = fmtDateYYYYMMDD(first);
              const e = fmtDateYYYYMMDD(nextFirst);
              setStartFilter(s);
              setEndFilter(e);
              loadShifts({ start: s, end: e });
            }} aria-label="This month"><i className="bi bi-calendar-month me-1"/>This Month</button>
          </div>
          <div className="btn-group me-2">
            <button className="btn btn-outline-secondary" onClick={exportCSV} aria-label="Export CSV"><i className="bi bi-filetype-csv me-1"/>CSV</button>
            <button className="btn btn-outline-secondary" onClick={exportICS} aria-label="Export ICS"><i className="bi bi-calendar2-week me-1"/>ICS</button>
          </div>
          {/* Assign Shift button moved to Weekly Availability header below */}
        </div>
      </div>

      {/* Weekly Availability Editor (Admin) */}
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex flex-column">
            <strong>Weekly Availability (Generate Shifts)</strong>
            <small className="text-muted">Create recurring shifts from a Monday–Sunday template</small>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => openModal()} aria-label="Assign shift">
            <i className="bi bi-plus-lg me-2"/>Assign Shift
          </button>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label" htmlFor="bulk-employee">Employee</label>
              <select id="bulk-employee" className="form-select" value={formData.employeeId || (employees[0]?.id || 0)}
                onChange={(e)=> setFormData({...formData, employeeId: Number(e.target.value)})} aria-label="Select employee for bulk">
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="bulk-start">Start week</label>
              <input id="bulk-start" type="date" className="form-control" value={bulkStartDate} onChange={(e)=>setBulkStartDate(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="bulk-weeks">Weeks</label>
              <input id="bulk-weeks" type="number" min={1} max={26} className="form-control" value={bulkWeeks} onChange={(e)=>setBulkWeeks(Number(e.target.value) || 1)} />
            </div>
          </div>
          <div className="row g-2 mt-3">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((label, idx)=>{
              const tpl = weekTemplate[idx];
              return (
                <div className="col-md-3 col-lg-2" key={label}>
                  <div className="card">
                    <div className="card-header py-1"><strong>{label}</strong></div>
                    <div className="card-body">
                      <label className="form-label" htmlFor={`day-${tpl.day}-start`}>Start</label>
                      <input id={`day-${tpl.day}-start`} type="time" className="form-control" value={tpl.startTime} onChange={(e)=>{
                        const v = e.target.value; const copy = [...weekTemplate]; copy[idx] = { ...tpl, startTime: v }; setWeekTemplate(copy);
                      }} />
                      <label className="form-label mt-2" htmlFor={`day-${tpl.day}-end`}>End</label>
                      <input id={`day-${tpl.day}-end`} type="time" className="form-control" value={tpl.endTime} onChange={(e)=>{
                        const v = e.target.value; const copy = [...weekTemplate]; copy[idx] = { ...tpl, endTime: v }; setWeekTemplate(copy);
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3">
            <button className="btn btn-outline-primary" onClick={async ()=>{
              const template = weekTemplate.filter(d => d.startTime && d.endTime);
              if (!template.length) { alert('Please set at least one day with start and end time'); return; }
              const payload = {
                employeeId: formData.employeeId || (employees[0]?.id || 0),
                startDate: bulkStartDate,
                weeks: bulkWeeks,
                weekTemplate: template
              };
              try {
                await api.post('/shifts/bulk', payload);
                loadShifts();
                alert('Shifts generated');
              } catch (e: any) {
                alert(`Failed to generate shifts: ${e.response?.data?.error || e.message}`);
              }
            }}>Generate Shifts</button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Duration</th>
                <th className="w-150"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => {
                const duration = (new Date(shift.end).getTime() - new Date(shift.start).getTime()) / (1000 * 60 * 60);
                return (
                  <tr key={shift.id}>
                    <td className="fw-medium">
                      {shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : `Employee #${shift.employeeId}`}
                    </td>
                    <td>{new Date(shift.start).toLocaleDateString()}</td>
                    <td>{formatTime(shift.start)}</td>
                    <td>{formatTime(shift.end)}</td>
                    <td>{duration.toFixed(1)} hrs</td>
                    <td>
                      <div className="d-inline-flex align-items-center gap-2 flex-nowrap">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openModal(shift)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteShift(shift.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No shifts scheduled
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'week' ? (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(weekCursor); d.setDate(d.getDate()-7); setWeekCursor(d); }} aria-label="Previous week"><i className="bi bi-chevron-left"/></button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const today=new Date(); const { start }=getWeekBounds(today); setWeekCursor(start); }} aria-label="This week">This Week</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(weekCursor); d.setDate(d.getDate()+7); setWeekCursor(d); }} aria-label="Next week"><i className="bi bi-chevron-right"/></button>
            </div>
            <h5 className="mb-0">
              {(() => { const { start, end } = getWeekBounds(weekCursor); return `Week of ${start.toLocaleDateString()} - ${new Date(end.getTime()-1).toLocaleDateString()}`; })()}
            </h5>
            <div className="w-150"></div>
          </div>
          {Object.keys(weeklyShifts).length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-calendar-x display-1 text-muted mb-3"></i>
              <p>No shifts scheduled</p>
            </div>
          ) : (
            Object.entries(weeklyShifts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([weekStart, weekShifts]) => {
                const startDate = new Date(weekStart);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                
                return (
                  <div key={weekStart} className="mb-4">
                    <h5 className="text-secondary">
                      Week of {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    </h5>
                    <div className="row">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => {
                        const dayDate = new Date(startDate);
                        dayDate.setDate(startDate.getDate() + dayIndex);
                        const dayShifts = weekShifts.filter(shift => 
                          new Date(shift.start).toDateString() === dayDate.toDateString()
                        );
                        
                        return (
                          <div key={day} className="col">
                            <div className="card h-100">
                              <div className="card-header text-center py-2">
                                <small className="fw-medium">{day}</small>
                                <br />
                                <small className="text-muted">{dayDate.getDate()}</small>
                              </div>
                              <div className="card-body p-2">
                                {dayShifts.map(shift => (
                                  <div key={shift.id} className="mb-2">
                                    <div className="small fw-medium">
                                      {shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : `Employee #${shift.employeeId}`}
                                    </div>
                                    <div className="small text-muted">
                                      {formatTime(shift.start)} - {formatTime(shift.end)}
                                    </div>
                                  </div>
                                ))}
                                {dayShifts.length === 0 && (
                                  <div className="text-center text-muted small">No shifts</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(monthCursor); d.setMonth(d.getMonth()-1); setMonthCursor(new Date(d)); }} aria-label="Previous month"><i className="bi bi-chevron-left"/></button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(); d.setDate(1); setMonthCursor(d); }} aria-label="This month">Today</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={()=>{ const d=new Date(monthCursor); d.setMonth(d.getMonth()+1); setMonthCursor(new Date(d)); }} aria-label="Next month"><i className="bi bi-chevron-right"/></button>
            </div>
            <h5 className="mb-0">{monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h5>
            <div className="w-150"></div>
          </div>
          <div className="row row-cols-7 g-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> (
              <div key={d} className="col"><div className="text-center small text-muted">{d}</div></div>
            ))}
            {monthDays.map((d, idx)=>{
              const isCurrentMonth = d.getMonth() === monthCursor.getMonth();
              const dayShifts = shifts.filter(s => sameDay(new Date(s.start), d));
              return (
                <div key={idx} className="col">
                  <div className={`card h-100 ${isCurrentMonth ? '' : 'opacity-50'}`}>
                    <div className="card-header d-flex justify-content-between align-items-center py-1">
                      <small>{d.getDate()}</small>
                      <div className="btn-group">
                        {dayShifts.length > 0 && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={()=>openDayDetails(d)} aria-label="View day details"><i className="bi bi-eye"/></button>
                        )}
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>openQuickAddForDate(d)} aria-label="Add shift for date"><i className="bi bi-plus"/></button>
                      </div>
                    </div>
                    <div className="card-body p-2">
                      {dayShifts.length === 0 ? (
                        <div className="text-muted small">No shifts</div>
                      ) : (
                        dayShifts.slice(0,3).map(s => (
                          <div key={s.id} className="small mb-1">
                            {formatTime(s.start)} - {formatTime(s.end)}
                          </div>
                        ))
                      )}
                      {dayShifts.length > 3 && (
                        <button className="btn btn-link btn-sm p-0 small" onClick={()=>openDayDetails(d)} aria-label="Show all shifts for day">+{dayShifts.length - 3} more</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {showModal && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingShift ? 'Edit Shift' : 'Assign Shift'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="shift-employee">Employee</label>
                    <select 
                      id="shift-employee"
                      className="form-select"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({...formData, employeeId: Number(e.target.value)})}
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
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label" htmlFor="shift-date">Date</label>
                    <input 
                      id="shift-date"
                      type="date"
                      className="form-control"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                      aria-label="Shift date"
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="shift-start">Start Time</label>
                      <input 
                        id="shift-start"
                        type="time"
                        className="form-control"
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        required
                        aria-label="Start time"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="shift-end">End Time</label>
                      <input 
                        id="shift-end"
                        type="time"
                        className="form-control"
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        required
                        aria-label="End time"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingShift ? 'Update' : 'Assign'} Shift
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Day details modal (Month view) */}
      {showDayModal && selectedDay && (
        <div className="modal show d-block modal-overlay z-2000">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Shifts on {selectedDay.toLocaleDateString()}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={()=> setShowDayModal(false)}></button>
              </div>
              <div className="modal-body">
                {shifts.filter(s => sameDay(new Date(s.start), selectedDay)).length === 0 ? (
                  <div className="text-muted">No shifts</div>
                ) : (
                  <ul className="list-group">
                    {shifts.filter(s => sameDay(new Date(s.start), selectedDay)).sort((a,b)=> new Date(a.start).getTime()-new Date(b.start).getTime()).map(s => (
                      <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-medium">{s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : `Employee #${s.employeeId}`}</div>
                          <div className="text-muted small">{formatTime(s.start)} - {formatTime(s.end)}</div>
                        </div>
                        <div className="btn-group">
                          <button className="btn btn-sm btn-outline-primary" onClick={()=>{ openModal(s); setShowDayModal(false); }}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={()=> deleteShift(s.id)}>Delete</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-primary" onClick={()=>{ openQuickAddForDate(selectedDay); setShowDayModal(false); }}>
                  <i className="bi bi-plus-lg me-1"/>Add shift for this day
                </button>
                <button className="btn btn-secondary" onClick={()=> setShowDayModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-apply month view date filters */}
      { /* Effect-like behavior embedded at end of component for clarity */ }
      {(() => {
        // This IIFE won't execute per render for side-effects; keep logic in useEffect below
        return null;
      })()}
    </div>
  );
}
