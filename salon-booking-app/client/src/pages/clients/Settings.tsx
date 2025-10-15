import { useState, useEffect } from 'react';
import { useAuth } from '../../shared/auth';
import { ThemeSelect } from '../../shared/ThemeToggle';
import { useConfig } from '../../shared/ConfigContext';

export default function Settings() {
  const { user } = useAuth();
  const { config, updateConfig } = useConfig();
  const [activeTab, setActiveTab] = useState('salon');
  const [salonSettings, setSalonSettings] = useState({
    appTitle: config.appTitle,
    businessName: config.businessName,
    address: config.address,
    phone: config.phone,
    email: config.email,
    website: config.website,
    openingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '10:00', close: '16:00', closed: true }
    }
  });

  // Update local state when config changes
  useEffect(() => {
    setSalonSettings(prev => ({
      ...prev,
      appTitle: config.appTitle,
      businessName: config.businessName,
      address: config.address,
      phone: config.phone,
      email: config.email,
      website: config.website
    }));
  }, [config]);
  const [bookingSettings, setBookingSettings] = useState({
    allowOnlineBooking: true,
    requireClientEmail: false,
    requireClientPhone: true,
    defaultAppointmentDuration: 30,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 2,
    allowCancellation: true,
    cancellationDeadlineHours: 24
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    reminderHours: 24,
    newBookingAlerts: true,
    cancellationAlerts: true
  });
  const [message, setMessage] = useState('');

  function handleSalonSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Update the global configuration
    updateConfig({
      businessName: salonSettings.businessName,
      address: salonSettings.address,
      phone: salonSettings.phone,
      email: salonSettings.email,
      website: salonSettings.website
    });
    setMessage('Salon settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  }

  function handleBookingSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('Booking settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  }

  function handleNotificationSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('Notification settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  }

  function updateOpeningHours(day: string, field: string, value: string | boolean) {
    setSalonSettings(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day as keyof typeof prev.openingHours],
          [field]: value
        }
      }
    }));
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Settings</h2>
        <div className="text-muted">
          <i className="bi bi-person-circle me-2"></i>
          {user?.email}
        </div>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible fade show">
          {message}
          <button type="button" className="btn-close" onClick={() => setMessage('')}></button>
        </div>
      )}

      {/* Settings Navigation */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'salon' ? 'active' : ''}`}
                onClick={() => setActiveTab('salon')}
              >
                <i className="bi bi-building me-2"></i>Salon Info
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'booking' ? 'active' : ''}`}
                onClick={() => setActiveTab('booking')}
              >
                <i className="bi bi-calendar-check me-2"></i>Booking
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <i className="bi bi-bell me-2"></i>Notifications
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <i className="bi bi-person me-2"></i>Account
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('theme')}
              >
                <i className="bi bi-palette me-2"></i>Theme
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* Salon Information Tab */}
          {activeTab === 'salon' && (
            <form onSubmit={handleSalonSettingsSubmit}>
              <h5 className="mb-3">Application Settings</h5>
              
              <div className="row mb-4">
                <div className="col-md-12">
                  <label className="form-label">
                    <i className="bi bi-tag me-2"></i>
                    Application Title (managed by Config)
                  </label>
                  <input 
                    type="text"
                    className="form-control"
                    value={salonSettings.appTitle}
                    placeholder="Application title managed by ConfigContext"
                    disabled
                  />
                  <div className="form-text">
                    The application title is controlled by the centralized configuration and cannot be edited from this form.
                  </div>
                  <div className="mt-2 p-2 bg-light rounded border">
                    <small className="text-muted">
                      <i className="bi bi-eye me-1"></i>
                      Current: <strong>{salonSettings.appTitle}</strong>
                    </small>
                  </div>
                </div>
              </div>

              <h5 className="mb-3">Business Information</h5>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Business Name</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={salonSettings.businessName}
                    onChange={(e) => setSalonSettings({...salonSettings, businessName: e.target.value})}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="tel"
                    className="form-control"
                    value={salonSettings.phone}
                    onChange={(e) => setSalonSettings({...salonSettings, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input 
                    type="email"
                    className="form-control"
                    value={salonSettings.email}
                    onChange={(e) => setSalonSettings({...salonSettings, email: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Website</label>
                  <input 
                    type="url"
                    className="form-control"
                    value={salonSettings.website}
                    onChange={(e) => setSalonSettings({...salonSettings, website: e.target.value})}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Address</label>
                <textarea 
                  className="form-control"
                  rows={2}
                  value={salonSettings.address}
                  onChange={(e) => setSalonSettings({...salonSettings, address: e.target.value})}
                />
              </div>

              <h5 className="mb-3">Business Hours</h5>
              <div className="table-responsive mb-4">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Status</th>
                      <th>Opening Time</th>
                      <th>Closing Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => {
                      const hours = salonSettings.openingHours[day.key as keyof typeof salonSettings.openingHours];
                      return (
                        <tr key={day.key}>
                          <td className="fw-medium">{day.label}</td>
                          <td>
                            <div className="form-check">
                              <input 
                                type="checkbox"
                                className="form-check-input"
                                checked={!hours.closed}
                                onChange={(e) => updateOpeningHours(day.key, 'closed', !e.target.checked)}
                              />
                              <label className="form-check-label">
                                Open
                              </label>
                            </div>
                          </td>
                          <td>
                            <input 
                              type="time"
                              className="form-control"
                              value={hours.open}
                              disabled={hours.closed}
                              onChange={(e) => updateOpeningHours(day.key, 'open', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="time"
                              className="form-control"
                              value={hours.close}
                              disabled={hours.closed}
                              onChange={(e) => updateOpeningHours(day.key, 'close', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button type="submit" className="btn btn-primary">
                Save Salon Settings
              </button>
            </form>
          )}

          {/* Booking Settings Tab */}
          {activeTab === 'booking' && (
            <form onSubmit={handleBookingSettingsSubmit}>
              <h5 className="mb-3">Online Booking</h5>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      type="checkbox"
                      className="form-check-input"
                      checked={bookingSettings.allowOnlineBooking}
                      onChange={(e) => setBookingSettings({...bookingSettings, allowOnlineBooking: e.target.checked})}
                    />
                    <label className="form-check-label">
                      Allow online booking
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      type="checkbox"
                      className="form-check-input"
                      checked={bookingSettings.allowCancellation}
                      onChange={(e) => setBookingSettings({...bookingSettings, allowCancellation: e.target.checked})}
                    />
                    <label className="form-check-label">
                      Allow online cancellation
                    </label>
                  </div>
                </div>
              </div>

              <h5 className="mb-3 mt-4">Client Requirements</h5>
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      type="checkbox"
                      className="form-check-input"
                      checked={bookingSettings.requireClientEmail}
                      onChange={(e) => setBookingSettings({...bookingSettings, requireClientEmail: e.target.checked})}
                    />
                    <label className="form-check-label">
                      Require client email
                    </label>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      type="checkbox"
                      className="form-check-input"
                      checked={bookingSettings.requireClientPhone}
                      onChange={(e) => setBookingSettings({...bookingSettings, requireClientPhone: e.target.checked})}
                    />
                    <label className="form-check-label">
                      Require client phone
                    </label>
                  </div>
                </div>
              </div>

              <h5 className="mb-3 mt-4">Booking Rules</h5>
              
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Default appointment duration (minutes)</label>
                  <input 
                    type="number"
                    className="form-control"
                    value={bookingSettings.defaultAppointmentDuration}
                    onChange={(e) => setBookingSettings({...bookingSettings, defaultAppointmentDuration: Number(e.target.value)})}
                    min="15"
                    step="15"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Max advance booking (days)</label>
                  <input 
                    type="number"
                    className="form-control"
                    value={bookingSettings.maxAdvanceBookingDays}
                    onChange={(e) => setBookingSettings({...bookingSettings, maxAdvanceBookingDays: Number(e.target.value)})}
                    min="1"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Min advance booking (hours)</label>
                  <input 
                    type="number"
                    className="form-control"
                    value={bookingSettings.minAdvanceBookingHours}
                    onChange={(e) => setBookingSettings({...bookingSettings, minAdvanceBookingHours: Number(e.target.value)})}
                    min="0"
                  />
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-md-6">
                  <label className="form-label">Cancellation deadline (hours before appointment)</label>
                  <input 
                    type="number"
                    className="form-control"
                    value={bookingSettings.cancellationDeadlineHours}
                    onChange={(e) => setBookingSettings({...bookingSettings, cancellationDeadlineHours: Number(e.target.value)})}
                    min="0"
                    disabled={!bookingSettings.allowCancellation}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                Save Booking Settings
              </button>
            </form>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div>
              <h5 className="mb-3">Account Information</h5>
              
              <div className="card mb-4">
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Email:</strong> {user?.email}</p>
                      <p><strong>Role:</strong> <span className={`badge ${user?.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>{user?.role}</span></p>
                      <p><strong>Account Created:</strong> Recently</p>
                    </div>
                  </div>
                </div>
              </div>

              <h5 className="mb-3">Change Password</h5>
              <form>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-control" />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-control" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-control" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div>
              <h5 className="mb-3">
                <i className="bi bi-palette me-2"></i>
                Theme Selection
              </h5>
              <p className="text-muted mb-4">
                Choose your preferred theme to customize the appearance of the salon booking system.
              </p>
              
              <ThemeSelect showAsCards={true} />
              
              <div className="mt-4 p-3 theme-info-box rounded">
                <h6 className="mb-2">
                  <i className="bi bi-info-circle me-2"></i>
                  Theme Information
                </h6>
                <ul className="mb-0 small">
                  <li><strong>Light Theme:</strong> Clean and bright interface perfect for daytime use</li>
                  <li><strong>Light • Purple:</strong> Professional light theme with modern purple accents</li>
                  <li><strong>Purple • Glow:</strong> Modern dark purple theme with glowing navbar and sidebar</li>
                  <li><strong>Dark Theme:</strong> Professional dark theme with modern Docker Desktop styling</li>
                  <li>The selected theme will be applied across all pages of the application</li>
                  <li>Your theme preference is saved in your browser for future visits</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
