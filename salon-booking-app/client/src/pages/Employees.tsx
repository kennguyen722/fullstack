import { useEffect, useState } from 'react';
import { api } from '../shared/api';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
  user?: {
    id: number;
    email: string;
    role: string;
  };
  skills?: {
    service: {
      id: number;
      name: string;
    };
  }[];
}

interface Service {
  id: number;
  name: string;
  categoryId: number;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    photoUrl: '',
    password: '',
    role: 'EMPLOYEE',
    serviceIds: [] as number[]
  });

  useEffect(() => {
    loadEmployees();
    loadServices();
  }, []);

  async function loadEmployees() {
    try {
      console.log('Loading employees...');
      const response = await api.get('/employees');
      console.log('Employees loaded:', response.data);
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to load employees:', error);
      alert('Failed to load employees. Please check the console for details.');
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

  function openModal(employee?: Employee) {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.user?.email || '',
        phone: employee.phone || '',
        bio: employee.bio || '',
        photoUrl: employee.photoUrl || '',
        password: '',
        role: employee.user?.role || 'EMPLOYEE',
        serviceIds: employee.skills?.map(s => s.service.id) || []
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bio: '',
        photoUrl: '',
        password: 'Welcome123!',
        role: 'EMPLOYEE',
        serviceIds: []
      });
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      console.log('Submitting employee data:', formData);
      if (editingEmployee) {
        console.log('Updating employee:', editingEmployee.id);
        const response = await api.put(`/employees/${editingEmployee.id}`, formData);
        console.log('Employee updated:', response.data);
      } else {
        console.log('Creating new employee');
        const response = await api.post('/employees', formData);
        console.log('Employee created:', response.data);
      }
      setShowModal(false);
      loadEmployees();
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      alert('Failed to save employee. Please check the console for details.');
    }
  }

  async function deleteEmployee(employeeId: number) {
    if (confirm('Are you sure you want to delete this employee? This will also delete their user account.')) {
      try {
        console.log('Deleting employee:', employeeId);
        await api.delete(`/employees/${employeeId}`);
        console.log('Employee deleted successfully');
        loadEmployees();
      } catch (error: any) {
        console.error('Failed to delete employee:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        alert('Failed to delete employee. Please check the console for details.');
      }
    }
  }

  function toggleService(serviceId: number) {
    const currentIds = formData.serviceIds;
    if (currentIds.includes(serviceId)) {
      setFormData({
        ...formData,
        serviceIds: currentIds.filter(id => id !== serviceId)
      });
    } else {
      setFormData({
        ...formData,
        serviceIds: [...currentIds, serviceId]
      });
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Employees</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <i className="bi bi-plus-lg me-2"/>Add Employee
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Services</th>
              <th style={{width: '120px'}}></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>
                  {e.photoUrl ? (
                    <img 
                      src={e.photoUrl} 
                      alt={`${e.firstName} ${e.lastName}`}
                      className="rounded-circle avatar-40"
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white avatar-40"
                    >
                      {e.firstName.charAt(0)}{e.lastName.charAt(0)}
                    </div>
                  )}
                </td>
                <td className="fw-medium">{e.firstName} {e.lastName}</td>
                <td className="text-secondary">{e.user?.email}</td>
                <td>{e.phone || '-'}</td>
                <td>
                  <span className={`badge ${e.user?.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                    {e.user?.role}
                  </span>
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {e.skills?.slice(0, 3).map((s) => (
                      <span key={s.service.id} className="badge bg-light text-dark">
                        {s.service.name}
                      </span>
                    ))}
                    {(e.skills?.length || 0) > 3 && (
                      <span className="badge bg-secondary">
                        +{(e.skills?.length || 0) - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="d-inline-flex align-items-center gap-2 flex-nowrap">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => openModal(e)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteEmployee(e.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <div className="modal show d-block modal-overlay">
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingEmployee ? 'Edit Employee' : 'Add Employee'}
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    aria-label="Close"
                    title="Close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        placeholder="First name"
                        aria-label="First name"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        placeholder="Last name"
                        aria-label="Last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input 
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="Email"
                        aria-label="Email"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input 
                        type="tel"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="Phone"
                        aria-label="Phone"
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        {editingEmployee ? 'New Password (leave blank to keep current)' : 'Password'}
                      </label>
                      <input 
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder={editingEmployee ? 'Leave blank to keep current' : 'Password'}
                        aria-label="Password"
                        required={!editingEmployee}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role</label>
                      <select 
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        aria-label="Role"
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Photo</label>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <div>
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Preview" className="rounded-circle avatar-40" />
                        ) : (
                          <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white avatar-40">
                            {formData.firstName?.charAt(0)}{formData.lastName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <input 
                          type="url"
                          className="form-control mb-2"
                          value={formData.photoUrl}
                          onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                          placeholder="https://example.com/photo.jpg"
                        />
                        {editingEmployee && (
                          <form
                            onSubmit={async (ev) => {
                              ev.preventDefault();
                              const input = (ev.currentTarget.elements.namedItem('avatar') as HTMLInputElement) || null;
                              const file = input?.files?.[0];
                              if (!file) return;
                              try {
                                const data = new FormData();
                                data.append('avatar', file);
                                const r = await api.post(`/employees/${editingEmployee.id}/avatar`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
                                setFormData({ ...formData, photoUrl: r.data.photoUrl });
                                // Update table immediately
                                setEmployees((prev) => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, photoUrl: r.data.photoUrl } : emp));
                              } catch (err: any) {
                                alert(`Failed to upload photo: ${err.response?.data?.error || err.message}`);
                              }
                            }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <input name="avatar" type="file" accept="image/*" className="form-control" aria-label="Choose photo" />
                              <button className="btn btn-outline-primary btn-center" type="submit">Upload</button>
                              {formData.photoUrl && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-center"
                                  onClick={async () => {
                                    if (!editingEmployee) return;
                                    if (!confirm('Remove this employee\'s photo?')) return;
                                    try {
                                      await api.delete(`/employees/${editingEmployee.id}/avatar`);
                                      setFormData({ ...formData, photoUrl: '' });
                                      setEmployees((prev) => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, photoUrl: undefined } : emp));
                                    } catch (err: any) {
                                      alert(`Failed to remove photo: ${err.response?.data?.error || err.message}`);
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Bio</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Brief description of experience and specialties"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Services</label>
                    <div className="border rounded p-3 scroll-200">
                      {services.map(service => (
                        <div key={service.id} className="form-check">
                          <input 
                            type="checkbox"
                            className="form-check-input"
                            id={`service-${service.id}`}
                            checked={formData.serviceIds.includes(service.id)}
                            onChange={() => toggleService(service.id)}
                          />
                          <label className="form-check-label" htmlFor={`service-${service.id}`}>
                            {service.name}
                          </label>
                        </div>
                      ))}
                      {services.length === 0 && (
                        <p className="text-muted mb-0">No services available</p>
                      )}
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
                    {editingEmployee ? 'Update' : 'Create'} Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
