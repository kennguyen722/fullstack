import { FormEvent, useEffect, useState } from 'react';
import { api } from '../shared/api';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  bio?: string;
  photoUrl?: string;
  skills: {
    service: {
      id: number;
      name: string;
      priceCents: number;
      durationMin: number;
    };
  }[];
}

interface Service {
  id: number;
  name: string;
  description?: string;
  priceCents: number;
  durationMin: number;
  categoryId: number;
}

interface ServiceCategory {
  id: number;
  name: string;
  desc?: string;
  services: Service[];
}

export default function Booking() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    birthday: ''
  });
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedService) {
      const employeesWithService = employees.filter(emp => {
        // Handle case where skills might be undefined or null
        if (!emp.skills || !Array.isArray(emp.skills)) {
          return false;
        }
        
        const hasService = emp.skills.some(skill => {
          return skill.service.id === selectedService.id;
        });
        
        return hasService;
      });
      
      setAvailableEmployees(employeesWithService);
      setSelectedEmployee(null);
    }
  }, [selectedService, employees]);

  useEffect(() => {
    if (selectedEmployee && selectedDate && selectedService) {
      generateTimeSlots();
    }
  }, [selectedEmployee, selectedDate, selectedService]);

  async function loadEmployees() {
    try {
      const response = await api.get('/public/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  }

  async function loadCategories() {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  function handleServiceSelect(service: Service) {
    setSelectedService(service);
    setStep(2);
  }

  function handleEmployeeSelect(employee: Employee) {
    setSelectedEmployee(employee);
    setStep(3);
  }

  function generateTimeSlots() {
    const slots: string[] = [];
    const startHour = 9;
    const endHour = 18;
    const duration = selectedService?.durationMin || 30;
    const slotInterval = 30; // 30-minute intervals

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const endTime = new Date();
        endTime.setHours(hour, minute + duration, 0, 0);
        
        if (endTime.getHours() <= endHour) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
    }
    
    setAvailableSlots(slots);
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setStep(4);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime || !clientInfo.name || !clientInfo.birthday || !clientInfo.email || !clientInfo.phone) {
      setMessage('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const appointmentDateTime = new Date(`${selectedDate}T${selectedTime}`);
      
      await api.post('/book', {
        employeeId: selectedEmployee.id,
        serviceId: selectedService.id,
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        clientBirthday: clientInfo.birthday,
        notes: clientInfo.notes,
        start: appointmentDateTime.toISOString()
      });
      
      setMessage('Appointment booked successfully! We will send you a confirmation email shortly.');
      setStep(5);
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'Failed to book appointment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function resetBooking() {
    setSelectedCategory('');
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedDate('');
    setSelectedTime('');
  setClientInfo({ name: '', email: '', phone: '', notes: '', birthday: '' });
    setStep(1);
    setMessage('');
  }

  const filteredServices = selectedCategory 
    ? categories.find(cat => cat.id === selectedCategory)?.services || []
    : categories.flatMap(cat => cat.services);

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="text-center mb-4">
            <h1 className="display-4 mb-3">Book Your Appointment</h1>
            <p className="lead text-muted">Experience professional beauty services with our skilled team</p>
          </div>

          {/* Progress Steps */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex justify-content-between position-relative">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div key={stepNum} className="d-flex flex-column align-items-center">
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center ${
                        step >= stepNum ? 'bg-primary text-white' : 'bg-light text-muted'
                      } w-40 h-40 z-2`}
                    >
                      {stepNum}
                    </div>
                    <small className="mt-1 text-center">
                      {stepNum === 1 && 'Service'}
                      {stepNum === 2 && 'Staff'}
                      {stepNum === 3 && 'Date & Time'}
                      {stepNum === 4 && 'Details'}
                    </small>
                  </div>
                ))}
                <div className="position-absolute steps-connector z-1" />
              </div>
            </div>
          </div>

          {message && (
            <div className={`alert ${step === 5 ? 'alert-success' : 'alert-info'} mb-4`}>
              {message}
            </div>
          )}

          {step === 1 && (
            <div className="card">
              <div className="card-header">
                <h4 className="mb-0">Choose a Service</h4>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label" htmlFor="filter-category">Filter by Category</label>
                  <select 
                    id="filter-category"
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value === '' ? '' : Number(e.target.value))}
                    title="Filter by category"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="row">
                  {filteredServices.map(service => (
                    <div key={service.id} className="col-md-6 mb-3">
                      <div 
                        className="card h-100 service-card cursor-pointer"
                        onClick={() => handleServiceSelect(service)}
                      >
                        <div className="card-body">
                          <h6 className="card-title">{service.name}</h6>
                          {service.description && (
                            <p className="card-text text-muted small">{service.description}</p>
                          )}
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold text-primary">${(service.priceCents / 100).toFixed(2)}</span>
                            <span className="text-muted small">{service.durationMin} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedService && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Choose Your Stylist</h4>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(1)}>
                  Back
                </button>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <strong>{selectedService?.name}</strong> - ${((selectedService?.priceCents || 0) / 100).toFixed(2)} ({selectedService?.durationMin} min)
                </div>
                
                <div className="row">
                  {availableEmployees.length > 0 ? (
                    availableEmployees.map(employee => (
                      <div key={employee.id} className="col-md-6 mb-3">
                        <div 
                          className="card h-100 employee-card cursor-pointer"
                          onClick={() => handleEmployeeSelect(employee)}
                        >
                          <div className="card-body text-center">
                            {employee.photoUrl ? (
                              <img 
                                src={employee.photoUrl} 
                                alt={`${employee.firstName} ${employee.lastName}`}
                                className="rounded-circle mb-3 avatar-80"
                              />
                            ) : (
                              <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white mx-auto mb-3 avatar-80-circle">
                                <span className="h4 mb-0">{employee.firstName.charAt(0)}{employee.lastName.charAt(0)}</span>
                              </div>
                            )}
                            <h6 className="card-title">{employee.firstName} {employee.lastName}</h6>
                            {employee.bio && (
                              <p className="card-text text-muted small">{employee.bio}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12">
                      <div className="alert alert-warning text-center">
                        <h5>No stylists available for this service</h5>
                        <p>Please try selecting a different service or contact us directly.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedEmployee && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Select Date & Time</h4>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(2)}>
                  Back
                </button>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <strong>{selectedService?.name}</strong> with <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label" htmlFor="booking-date">Select Date</label>
                    <input 
                      type="date"
                      id="booking-date"
                      className="form-control"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      title="Select appointment date"
                    />
                  </div>
                  
                  {selectedDate && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Available Times</label>
                      <div className="d-flex flex-wrap gap-2">
                        {availableSlots.map(time => (
                          <button
                            key={time}
                            className={`btn ${selectedTime === time ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                            onClick={() => handleTimeSelect(time)}
                          >
                            {new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Your Information</h4>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setStep(3)}>
                  Back
                </button>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <strong>Appointment Summary:</strong><br/>
                  {selectedService?.name} with {selectedEmployee?.firstName} {selectedEmployee?.lastName}<br/>
                  {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString()} at {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="client-name">Full Name *</label>
                      <input 
                        type="text"
                        id="client-name"
                        className="form-control"
                        value={clientInfo.name}
                        onChange={(e) => setClientInfo({...clientInfo, name: e.target.value})}
                        required
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="client-birthday">Birthday *</label>
                      <input 
                        type="date"
                        id="client-birthday"
                        className="form-control"
                        value={clientInfo.birthday}
                        onChange={(e) => setClientInfo({...clientInfo, birthday: e.target.value})}
                        required
                        title="Your birthday"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="client-email">Email *</label>
                      <input 
                        type="email"
                        id="client-email"
                        className="form-control"
                        value={clientInfo.email}
                        onChange={(e) => setClientInfo({...clientInfo, email: e.target.value})}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label" htmlFor="client-phone">Phone Number *</label>
                      <input 
                        type="tel"
                        id="client-phone"
                        className="form-control"
                        value={clientInfo.phone}
                        onChange={(e) => setClientInfo({...clientInfo, phone: e.target.value})}
                        placeholder="(555) 555-5555"
                        title="Your phone number"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Special Requests (Optional)</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={clientInfo.notes}
                      onChange={(e) => setClientInfo({...clientInfo, notes: e.target.value})}
                      placeholder="Any special requests or notes for your appointment..."
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-check-circle text-success display-1 mb-3"></i>
                <h3 className="text-success mb-3">Appointment Confirmed!</h3>
                <p className="lead">Thank you for booking with us. We look forward to seeing you!</p>
                <button className="btn btn-primary btn-lg" onClick={resetBooking}>
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
