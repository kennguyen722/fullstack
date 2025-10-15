import { useEffect, useState } from 'react';
import { api } from '../../shared/api';
import { useAuth } from '../../shared/auth';

interface Appointment {
  id: number;
  clientName: string;
  start: string;
  end: string;
  status: string;
  service: {
    name: string;
    priceCents: number;
  };
  employee: {
    firstName: string;
    lastName: string;
  };
}

interface DashboardStats {
  todayAppointments: number;
  weeklyRevenue: number;
  totalEmployees: number;
  totalServices: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    weeklyRevenue: 0,
    totalEmployees: 0,
    totalServices: 0
  });
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState<Appointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'today' | 'upcoming' | 'selected'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // Load appointments
      const appointmentsResponse = user?.role === 'ADMIN' 
        ? await api.get('/appointments')
        : await api.get('/appointments/my');
      
      const appointments = appointmentsResponse.data;
      setAllAppointments(appointments);
      
      // Filter today's appointments
      const today = new Date().toDateString();
      const todaysAppts = appointments.filter((appt: Appointment) => 
        new Date(appt.start).toDateString() === today
      );
      
      // Get recent appointments (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentAppts = appointments
        .filter((appt: Appointment) => new Date(appt.start) >= lastWeek)
        .sort((a: Appointment, b: Appointment) => new Date(b.start).getTime() - new Date(a.start).getTime())
        .slice(0, 5);

      setTodayAppointments(todaysAppts);
      setRecentAppointments(recentAppts);
      
      // Load selected date appointments if different from today
      if (selectedDate !== new Date().toISOString().split('T')[0]) {
        loadAppointmentsForDate(selectedDate);
      } else {
        setSelectedDateAppointments(todaysAppts);
      }

      // Calculate weekly revenue
      const weeklyRevenue = recentAppts.reduce((sum: number, appt: Appointment) => 
        sum + (appt.service?.priceCents || 0), 0
      );

      // Load other stats for admin
      if (user?.role === 'ADMIN') {
        const [employeesResponse, categoriesResponse] = await Promise.all([
          api.get('/employees'),
          api.get('/categories')
        ]);
        
        const totalServices = categoriesResponse.data.reduce((sum: number, cat: any) => 
          sum + (cat.services?.length || 0), 0
        );

        setStats({
          todayAppointments: todaysAppts.length,
          weeklyRevenue: weeklyRevenue / 100,
          totalEmployees: employeesResponse.data.length,
          totalServices
        });
      } else {
        setStats({
          todayAppointments: todaysAppts.length,
          weeklyRevenue: weeklyRevenue / 100,
          totalEmployees: 0,
          totalServices: 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function loadAppointmentsForDate(date: string) {
    const selectedDateObj = new Date(date).toDateString();
    const dateAppointments = allAppointments.filter((appt: Appointment) => 
      new Date(appt.start).toDateString() === selectedDateObj
    );
    setSelectedDateAppointments(dateAppointments);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setViewMode('selected');
    loadAppointmentsForDate(date);
  }

  function getUpcomingAppointments() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allAppointments
      .filter((appt: Appointment) => new Date(appt.start) >= tomorrow)
      .sort((a: Appointment, b: Appointment) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10);
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getStatusBadgeClass(status: string) {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'canceled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  async function updateAppointmentStatus(appointmentId: number, newStatus: string) {
    if (user?.role !== 'ADMIN') return;
    
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus.toUpperCase() });
      
      // Reload data to reflect changes
      await loadDashboardData();
    } catch (error: any) {
      console.error('Failed to update appointment status:', error);
      alert(`Failed to update appointment: ${error.response?.data?.error || error.message}`);
    }
  }

  function getDisplayAppointments() {
    switch (viewMode) {
      case 'today':
        return todayAppointments;
      case 'upcoming':
        return getUpcomingAppointments();
      case 'selected':
        return selectedDateAppointments;
      default:
        return todayAppointments;
    }
  }

  function getScheduleTitle() {
    switch (viewMode) {
      case 'today':
        return "Today's Schedule";
      case 'upcoming':
        return "Upcoming Appointments";
      case 'selected':
        return `Schedule for ${new Date(selectedDate).toLocaleDateString()}`;
      default:
        return "Schedule";
    }
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '400px'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dashboard</h2>
        <div className="text-muted">
          Welcome back, {user?.email}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Today's Appointments</h6>
                  <h3 className="mb-0">{stats.todayAppointments}</h3>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-calendar-check display-6"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Weekly Revenue</h6>
                  <h3 className="mb-0">${stats.weeklyRevenue.toFixed(2)}</h3>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-currency-dollar display-6"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <>
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Total Employees</h6>
                      <h3 className="mb-0">{stats.totalEmployees}</h3>
                    </div>
                    <div className="align-self-center">
                      <i className="bi bi-people display-6"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Total Services</h6>
                      <h3 className="mb-0">{stats.totalServices}</h3>
                    </div>
                    <div className="align-self-center">
                      <i className="bi bi-bag-check display-6"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="row">
        {/* Enhanced Schedule Section */}
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">{getScheduleTitle()}</h5>
                <span className="badge bg-primary">{getDisplayAppointments().length} appointments</span>
              </div>
              
              {/* View Mode Buttons */}
              <div className="btn-group btn-group-sm mb-3" role="group">
                <button 
                  className={`btn ${viewMode === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('today')}
                >
                  Today
                </button>
                <button 
                  className={`btn ${viewMode === 'upcoming' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('upcoming')}
                >
                  Upcoming
                </button>
              </div>
              
              {/* Date Selector */}
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label small">Select Date:</label>
                  <input 
                    type="date"
                    className="form-control form-control-sm"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="card-body">
              {getDisplayAppointments().length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-calendar-x display-4 text-muted mb-3"></i>
                  <p>No appointments scheduled for this period</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {getDisplayAppointments().map(appointment => (
                    <div key={appointment.id} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">{appointment.clientName}</h6>
                            <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          <p className="mb-1 text-muted">
                            <strong>{appointment.service.name}</strong>
                            {user?.role === 'ADMIN' && ` • ${appointment.employee.firstName} ${appointment.employee.lastName}`}
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              {new Date(appointment.start).toLocaleDateString()} • {formatTime(appointment.start)} - {formatTime(appointment.end)}
                            </small>
                            <small className="text-muted fw-bold">
                              ${(appointment.service.priceCents / 100).toFixed(2)}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      {/* Admin Actions */}
                      {user?.role === 'ADMIN' && appointment.status !== 'CANCELED' && (
                        <div className="mt-2">
                          <div className="btn-group btn-group-sm">
                            {appointment.status !== 'CONFIRMED' && (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => updateAppointmentStatus(appointment.id, 'CONFIRMED')}
                              >
                                <i className="bi bi-check-circle me-1"></i>Confirm
                              </button>
                            )}
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'CANCELED')}
                            >
                              <i className="bi bi-x-circle me-1"></i>Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="col-lg-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Recent Bookings</h5>
            </div>
            <div className="card-body">
              {recentAppointments.length === 0 ? (
                <div className="text-center text-muted py-3">
                  <p className="mb-0">No recent appointments</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {recentAppointments.map(appointment => (
                    <div key={appointment.id} className="list-group-item px-0 py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1 small">{appointment.clientName}</h6>
                          <p className="mb-1 small text-muted">{appointment.service.name}</p>
                          <small className="text-muted">
                            {new Date(appointment.start).toLocaleDateString()}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(appointment.status)} small`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {user?.role === 'ADMIN' && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-primary w-100" onClick={() => window.location.href = '/services'}>
                      <i className="bi bi-plus-circle me-2"></i>Add Service
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-primary w-100" onClick={() => window.location.href = '/employees'}>
                      <i className="bi bi-person-plus me-2"></i>Add Employee
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-primary w-100" onClick={() => window.location.href = '/shifts'}>
                      <i className="bi bi-calendar-plus me-2"></i>Schedule Shift
                    </button>
                  </div>
                  <div className="col-md-3 mb-2">
                    <button className="btn btn-outline-primary w-100" onClick={() => window.location.href = '/appointments'}>
                      <i className="bi bi-eye me-2"></i>View All Appointments
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
