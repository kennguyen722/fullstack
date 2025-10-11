import { useEffect, useState } from 'react';
import { api } from '../shared/api';

type Exp = { company: string; role: string; startDate: string; endDate?: string; description: string };
type Edu = { school: string; degree: string; field: string; startDate: string; endDate?: string; description: string };
type Lead = { organization: string; title: string; startDate: string; endDate?: string; description: string };
type Skill = { description: string };

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [dirty, setDirty] = useState(false);
  const [data, setData] = useState<any>({
    headline: '',
    summary: '',
    displayName: '',
    profileName: '',
    photoUrl: '',
    location: '',
    address: '',
    phone: '',
    availability: '',
    focusAreas: '',
    email: '',
    linkedin: '',
    github: '',
    experiences: [],
    educations: [],
    leaderships: [],
    skills: []
  });
  const [acct, setAcct] = useState<{ email: string; defaultEmail: string; defaultPassword: string } | null>(null);
  // Also track login email from localStorage so non-admin users still see it
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [pw, setPw] = useState<{ currentPassword: string; newPassword: string }>({ currentPassword: '', newPassword: '' });
  const [emailChange, setEmailChange] = useState<{ currentPassword: string; newEmail: string }>({ currentPassword: '', newEmail: '' });
  const [showEmailCur, setShowEmailCur] = useState(false);
  const [showPwCur, setShowPwCur] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    const t = localStorage.getItem('theme') || 'purple-light';
    return t === 'dark' || t === 'purple-light' || t === 'executive' ? t : 'purple-light';
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profile/me');
        if (res.data.profile) {
          const p = res.data.profile;
          // Map server 'slug' to UI 'profileName' so the field shows the stored value
          setData({ ...p, profileName: p.slug || '' });
        }
        // load account credential info
        try {
          const acctRes = await api.get('/account/credentials');
          setAcct(acctRes.data);
        } catch {}
      } catch (err: any) {
        setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    })();
    // Initialize login email from localStorage and keep in sync
    try {
      const raw = localStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      setLoginEmail(u?.email || null);
    } catch { setLoginEmail(null); }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'user') {
        try { const u = ev.newValue ? JSON.parse(ev.newValue) : null; setLoginEmail(u?.email || null); } catch { setLoginEmail(null); }
      }
    };
    const onAuthChanged = () => {
      try { const raw = localStorage.getItem('user'); const u = raw ? JSON.parse(raw) : null; setLoginEmail(u?.email || null); } catch { setLoginEmail(null); }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    const onThemeChanged = () => {
      const t = localStorage.getItem('theme') || 'purple-light';
      setTheme(t);
    };
    window.addEventListener('theme-changed', onThemeChanged as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
      window.removeEventListener('theme-changed', onThemeChanged as EventListener);
    };
  }, []);

  // Listen for navbar-triggered save
  useEffect(() => {
    const onSave = () => { if (!saving) save(); };
    window.addEventListener('profile-save', onSave);
    return () => window.removeEventListener('profile-save', onSave);
  }, [saving, data]);

  // Warn on navigation/refresh if there are unsaved changes
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  // Apply theme immediately when changed here
  useEffect(() => {
    const root = document.documentElement;
    const t = theme;
  const normalized = (t === 'dark' || t === 'purple-light' || t === 'executive') ? t : 'purple-light';
    root.setAttribute('data-theme', normalized);
  }, [theme]);

  // --- Validation helpers ---
  const isEmailValid = (s: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(s);
  const isUrlLike = (s: string) => /^https?:\/\//i.test(s) || /^www\./i.test(s) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(s);

  function validate(): boolean {
    const nextErrors: any = {};
    // simple fields
    if (data.profileName) {
      const s = String(data.profileName).trim().toLowerCase();
      const norm = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (norm.length < 3) nextErrors.profileName = 'Profile name must be at least 3 characters';
      if (norm.length > 80) nextErrors.profileName = 'Profile name is too long';
      if (!/^[a-z0-9-]+$/.test(norm)) nextErrors.profileName = 'Only letters, numbers, and dashes allowed';
    }
    if (data.email && !isEmailValid(data.email)) {
      nextErrors.email = 'Enter a valid email or leave empty';
    }
    if (data.linkedin && !isUrlLike(data.linkedin)) {
      nextErrors.linkedin = 'Enter a valid LinkedIn URL or leave empty';
    }
    if (data.github && !isUrlLike(data.github)) {
      nextErrors.github = 'Enter a valid GitHub URL or leave empty';
    }
    // collections
    const checkPartials = (
      arr: any[] | undefined,
      required: string[],
      key: 'experiences' | 'educations' | 'leaderships'
    ) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item, idx) => {
        const values = Object.values(item || {}).map(v => String(v || '').trim());
        const anyFilled = values.some(Boolean);
        if (!anyFilled) return; // completely empty row is okay (will be filtered server-side)
        required.forEach((rk) => {
          const val = String(item?.[rk] ?? '').trim();
          if (!val) {
            nextErrors[key] = nextErrors[key] || {};
            nextErrors[key][idx] = nextErrors[key][idx] || {};
            nextErrors[key][idx][rk] = 'Required';
          }
        });
      });
    };
    checkPartials(data.experiences, ['company', 'role', 'startDate'], 'experiences');
    checkPartials(data.educations, ['school', 'degree', 'field', 'startDate'], 'educations');
    checkPartials(data.leaderships, ['organization', 'title', 'startDate'], 'leaderships');

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const clearError = (collection: string | null, idx?: number, key?: string) => {
    setErrors((prev: any) => {
      const copy = { ...prev };
      if (!collection) return copy; // for top-level we handle inline
      if (idx === undefined || key === undefined) return copy;
      if (copy?.[collection]?.[idx]?.[key]) {
        const col = { ...(copy[collection] || {}) };
        const row = { ...(col[idx] || {}) };
        delete row[key];
        if (Object.keys(row).length === 0) {
          delete col[idx];
        } else {
          col[idx] = row;
        }
        if (Object.keys(col).length === 0) {
          delete copy[collection];
        } else {
          copy[collection] = col;
        }
      }
      return copy;
    });
  };

  // Mark dirty on any field change wrapper
  const setDataDirty = (next: any) => {
    setData(next);
    if (!dirty) {
      setDirty(true);
      window.dispatchEvent(new CustomEvent('profile-dirty', { detail: { dirty: true } }));
    }
  };

  async function save() {
    setSaving(true);
    // notify navbar
    window.dispatchEvent(new CustomEvent('profile-saving', { detail: { saving: true } }));
    setMessage(null);
    try {
      // client-side validation first
      if (!validate()) {
        setMessage({ type: 'danger', text: 'Please fix the highlighted fields.' });
        return;
      }
  const res = await api.put('/profile/me', data);
  // Reflect saved data including slug -> profileName
  const p = res.data?.profile;
  if (p) setData({ ...p, profileName: p.slug || data.profileName || '' });
  setMessage({ type: 'success', text: 'Profile saved' });
      // notify other tabs/components
      localStorage.setItem('profileUpdatedAt', String(Date.now()));
      window.dispatchEvent(new Event('profile-updated'));
      // clear dirty
      if (dirty) {
        setDirty(false);
        window.dispatchEvent(new CustomEvent('profile-dirty', { detail: { dirty: false } }));
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to save profile' });
    } finally {
      setSaving(false);
      window.dispatchEvent(new CustomEvent('profile-saving', { detail: { saving: false } }));
    }
  }

  async function uploadPhoto(file: File) {
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/profile/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.url) {
        setData((prev: any) => ({ ...prev, photoUrl: res.data.url }));
        setMessage({ type: 'success', text: 'Photo uploaded' });
        // notify live listeners so dashboard refreshes without reload
        localStorage.setItem('profileUpdatedAt', String(Date.now()));
        window.dispatchEvent(new Event('profile-updated'));
      }
    } catch (err: any) {
      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to upload photo' });
    }
  }

  if (loading) return <div>Loading...</div>;
  return (
    <div className="row g-4">
      <div className="col-12">
        {message && (
          <div className={`alert alert-${message.type}`} role="alert">
            {message.text}
          </div>
        )}
      </div>
      {/* Left: Main profile editor */}
      <div className="col-12 col-lg-8">
        <div className="p-4 rounded border">
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="pf-headline" className="form-label">Headline</label>
              <input id="pf-headline" className="form-control" placeholder="Senior Software Engineer" value={data.headline || ''} onChange={e => setDataDirty({ ...data, headline: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor="pf-displayname" className="form-label">Display name</label>
              <input id="pf-displayname" className="form-control" placeholder="Your name (sidebar title)" value={data.displayName || ''} onChange={e => setDataDirty({ ...data, displayName: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor="pf-profilename" className="form-label">Profile name (public URL)</label>
              <input
                id="pf-profilename"
                className={`form-control${errors.profileName ? ' is-invalid' : ''}`}
                placeholder="e.g., ken-nguyen"
                value={data.profileName || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDataDirty({ ...data, profileName: raw });
                  setErrors((prev:any) => ({ ...prev, profileName: undefined }));
                }}
              />
              <div className="form-text">Your public link: <code>/p/&lt;profile-name&gt;</code></div>
              {errors.profileName && (<div className="invalid-feedback">{errors.profileName}</div>)}
            </div>
            <div className="col-md-8">
              <label htmlFor="pf-photo-file" className="form-label">Profile photo</label>
              <input id="pf-photo-file" type="file" accept="image/*" className="form-control" onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <div className="w-100 d-flex align-items-center justify-content-between gap-2">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt="Profile preview" className="img-fluid rounded photo-preview" />
                ) : (
                  <div className="text-muted-2 small">Upload a photo to preview</div>
                )}
                {data.photoUrl && (
                  <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setDataDirty((p: any) => ({ ...p, photoUrl: '' }))}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="col-12">
              <label htmlFor="pf-summary" className="form-label">Professional Summary</label>
              <textarea id="pf-summary" className="form-control" rows={3} placeholder="Short professional summary" value={data.summary || ''} onChange={e => setDataDirty({ ...data, summary: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="row g-3 mt-3">
          <div className="col-md-6">
            <label htmlFor="pf-location" className="form-label">Work Location</label>
            <input id="pf-location" className="form-control" placeholder="e.g., Remote · Worldwide" value={data.location || ''} onChange={e => setDataDirty({ ...data, location: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-address" className="form-label">Home Address</label>
            <input id="pf-address" className="form-control" placeholder="Street, City, State/Province" value={data.address || ''} onChange={e => setDataDirty({ ...data, address: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-phone" className="form-label">Cell Phone</label>
            <input id="pf-phone" className="form-control" placeholder="e.g., +1 (555) 123-4567" value={data.phone || ''} onChange={e => setDataDirty({ ...data, phone: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-availability" className="form-label">Availability</label>
            <input id="pf-availability" className="form-control" placeholder="e.g., Open to full-time roles" value={data.availability || ''} onChange={e => setDataDirty({ ...data, availability: e.target.value })} />
          </div>
          <div className="col-12">
            <label htmlFor="pf-focus" className="form-label">Focus areas</label>
            <input id="pf-focus" className="form-control" placeholder="e.g., Platform architecture · Developer experience · Applied AI" value={data.focusAreas || ''} onChange={e => setDataDirty({ ...data, focusAreas: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-email" className="form-label">Email</label>
            <input id="pf-email" type="email" className={`form-control${errors.email ? ' is-invalid' : ''}`} placeholder="hello@example.com" value={data.email || ''} onChange={e => { setDataDirty({ ...data, email: e.target.value }); setErrors((prev:any) => ({ ...prev, email: undefined })); }} />
            {errors.email && (<div className="invalid-feedback">{errors.email}</div>)}
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-linkedin" className="form-label">LinkedIn URL</label>
            <input id="pf-linkedin" type="url" className={`form-control${errors.linkedin ? ' is-invalid' : ''}`} placeholder="https://www.linkedin.com/in/your-profile" value={data.linkedin || ''} onChange={e => { setDataDirty({ ...data, linkedin: e.target.value || '' }); setErrors((prev:any) => ({ ...prev, linkedin: undefined })); }} />
            {errors.linkedin && (<div className="invalid-feedback">{errors.linkedin}</div>)}
          </div>
          <div className="col-md-6">
            <label htmlFor="pf-github" className="form-label">GitHub URL</label>
            <input id="pf-github" type="url" className={`form-control${errors.github ? ' is-invalid' : ''}`} placeholder="https://github.com/your-handle" value={data.github || ''} onChange={e => { setDataDirty({ ...data, github: e.target.value || '' }); setErrors((prev:any) => ({ ...prev, github: undefined })); }} />
            {errors.github && (<div className="invalid-feedback">{errors.github}</div>)}
          </div>
        </div>

        {data.profileName && (
          <div className="mt-2 d-flex align-items-center gap-2">
            <span className="text-soft small">Public link:</span>
            <code className="small">/p/{String(data.profileName).trim()}</code>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={async () => {
                try {
                  const origin = window.location.origin;
                  const url = `${origin}/p/${encodeURIComponent(String(data.profileName).trim())}`;
                  await navigator.clipboard.writeText(url);
                  setMessage({ type: 'success', text: 'Public link copied to clipboard' });
                } catch {
                  setMessage({ type: 'danger', text: 'Failed to copy link' });
                }
              }}
            >Copy link</button>
          </div>
        )}

  <EditableSection title="Professional Experience" collectionKey="experiences" errors={errors} onClearError={clearError} items={data.experiences} setItems={(items) => setDataDirty({ ...data, experiences: items })} fields={[
          { key: 'company', label: 'Company' },
          { key: 'role', label: 'Role' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'endDate', label: 'End Date' },
          { key: 'description', label: 'Description', textarea: true }
        ]} />

  <EditableSection title="Education" collectionKey="educations" errors={errors} onClearError={clearError} items={data.educations} setItems={(items) => setDataDirty({ ...data, educations: items })} fields={[
          { key: 'school', label: 'School' },
          { key: 'degree', label: 'Degree' },
          { key: 'field', label: 'Field' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'endDate', label: 'End Date' },
          { key: 'description', label: 'Description', textarea: true }
        ]} />

  <EditableSection title="Freelance & Leadership Experience" collectionKey="leaderships" errors={errors} onClearError={clearError} items={data.leaderships} setItems={(items) => setDataDirty({ ...data, leaderships: items })} fields={[
          { key: 'organization', label: 'Organization' },
          { key: 'title', label: 'Title' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'endDate', label: 'End Date' },
          { key: 'description', label: 'Description', textarea: true }
        ]} />

  <EditableSection title="Core Technical Skills" collectionKey="skills" errors={errors} onClearError={clearError} items={data.skills} setItems={(items) => setDataDirty({ ...data, skills: items })} fields={[
          { key: 'description', label: 'Description', textarea: true }
        ]} />

        <div className="mt-3">
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </div>

      {/* Right: Sticky Account panel */}
      <aside className="col-12 col-lg-4">
        <div className="account-sticky">
          <div className="card p-3">
            {/* Settings section (Theme) */}
            <div className="mb-3">
              <h4 className="text-accent mb-2">Settings</h4>
              <label htmlFor="pf-theme" className="form-label">Theme Selection</label>
              <select
                id="pf-theme"
                className="form-select form-select-sm bg-transparent text-light border-secondary theme-select"
                value={theme}
                onChange={(e) => {
                  const v = e.target.value;
                  setTheme(v);
                  localStorage.setItem('theme', v);
                  window.dispatchEvent(new Event('theme-changed'));
                }}
              >
                <option value="dark">Dark (Professional)</option>
                <option value="purple-light">Light • Purple</option>
                <option value="executive">Executive • Navy/Gold</option>
              </select>
            </div>
            <h4 className="text-accent mb-3">Account</h4>
            <div className="row g-3 align-items-end">
              <div className="col-12">
                <label htmlFor="pf-acct-email" className="form-label">Login email</label>
                <input id="pf-acct-email" className="form-control" value={acct?.email || loginEmail || ''} readOnly title="Current login email" />
                {acct ? (
                  <div className="form-text">Default: {acct?.defaultEmail || '(not set)'} </div>
                ) : null}
              </div>
              <div className="col-12">
                <label htmlFor="pf-acct-newemail" className="form-label">New email</label>
                <input id="pf-acct-newemail" type="email" className="form-control" placeholder="name@example.com" value={emailChange.newEmail} onChange={(e) => setEmailChange({ ...emailChange, newEmail: e.target.value })} />
              </div>
              <div className="col-12">
                <label htmlFor="pf-acct-cur-for-email" className="form-label">Current password (for email change)</label>
                <div className="input-group">
                  <input
                    id="pf-acct-cur-for-email"
                    type={showEmailCur ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter current password"
                    name="current-password"
                    autoComplete="current-password"
                    value={emailChange.currentPassword}
                    onChange={(e) => setEmailChange({ ...emailChange, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-light"
                    aria-label={showEmailCur ? 'Hide current password' : 'Show current password'}
                    onClick={() => setShowEmailCur(v => !v)}
                  >
                    {showEmailCur ? (
                      // eye-off icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.58-1.36 1.52-2.62 2.73-3.68"/>
                        <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/>
                        <path d="M6.1 6.1 1 1m22 22-5.1-5.1M21.82 12c-.61 1.45-1.6 2.77-2.88 3.86"/>
                      </svg>
                    ) : (
                      // eye icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="col-12 d-flex gap-2">
                <button
                  className="btn btn-outline-light"
                  onClick={async () => {
                    setMessage(null);
                    try {
                      if (!emailChange.newEmail || !emailChange.currentPassword) {
                        setMessage({ type: 'danger', text: 'Enter new email and current password.' });
                        return;
                      }
                      const res = await api.put('/account/email', emailChange);
                      // Update displayed email then force re-login to refresh token bound context
                      setAcct((prev) => prev ? { ...prev, email: res.data?.user?.email || prev.email } : prev);
                      setEmailChange({ currentPassword: '', newEmail: '' });
                      setMessage({ type: 'success', text: 'Email updated. Redirecting to login...' });
                      setTimeout(() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                      }, 800);
                    } catch (err: any) {
                      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to update email' });
                    }
                  }}
                >
                  Change email
                </button>
              </div>
              <div className="col-12">
                <label htmlFor="pf-acct-cur-for-pw" className="form-label">Current password</label>
                <div className="input-group">
                  <input
                    id="pf-acct-cur-for-pw"
                    type={showPwCur ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter current password"
                    name="current-password"
                    autoComplete="current-password"
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-light"
                    aria-label={showPwCur ? 'Hide current password' : 'Show current password'}
                    onClick={() => setShowPwCur(v => !v)}
                  >
                    {showPwCur ? (
                      // eye-off icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.58-1.36 1.52-2.62 2.73-3.68"/>
                        <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83"/>
                        <path d="M6.1 6.1 1 1m22 22-5.1-5.1M21.82 12c-.61 1.45-1.6 2.77-2.88 3.86"/>
                      </svg>
                    ) : (
                      // eye icon
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label">New password</label>
                <input type="password" name="new-password" autoComplete="new-password" className="form-control" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="At least 8 characters" />
              </div>
              <div className="col-12 d-flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    setMessage(null);
                    try {
                      if (!pw.currentPassword || !pw.newPassword) {
                        setMessage({ type: 'danger', text: 'Enter current and new password.' });
                        return;
                      }
                      await api.put('/account/password', pw);
                      setMessage({ type: 'success', text: 'Password updated. Redirecting to login...' });
                      setPw({ currentPassword: '', newPassword: '' });
                      setTimeout(() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                      }, 800);
                    } catch (err: any) {
                      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to update password' });
                    }
                  }}
                >
                  Change password
                </button>
                <button
                  className="btn btn-outline-light"
                  onClick={async () => {
                    if (!confirm('Reset admin email/password to defaults from server env?')) return;
                    setMessage(null);
                    try {
                      const res = await api.post('/account/reset');
                      // After reset, update acct email and clear fields
                      setAcct((prev) => prev ? { ...prev, email: res.data?.user?.email || prev.email } : prev);
                      setPw({ currentPassword: '', newPassword: '' });
                      setMessage({ type: 'success', text: 'Credentials reset. Redirecting to login...' });
                      setTimeout(() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                      }, 800);
                    } catch (err: any) {
                      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to reset credentials' });
                    }
                  }}
                >
                  Reset to default
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

type FieldDef = { key: string; label: string; textarea?: boolean };
function EditableSection({ title, items, setItems, fields, errors, onClearError, collectionKey }: { title: string; items: any[]; setItems: (items: any[]) => void; fields: FieldDef[]; errors?: any; onClearError?: (collection: string | null, idx?: number, key?: string) => void; collectionKey: string }) {
  function add() {
    setItems([...(items || []), Object.fromEntries(fields.map(f => [f.key, '']))]);
  }
  function remove(idx: number) {
    if (!confirm('Remove this entry?')) return;
    setItems(items.filter((_, i) => i !== idx));
  }
  function update(idx: number, key: string, value: string) {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [key]: value };
    setItems(copy);
    onClearError && onClearError(collectionKey, idx, key);
  }
  return (
    <div className="col-12">
      <div className="d-flex align-items-center mb-2">
        <h4 className="text-accent mb-0 me-3">{title}</h4>
        <button className="btn btn-sm btn-primary" onClick={add}>Add</button>
      </div>
      <div className="vstack gap-3">
        {(items || []).map((item, idx) => (
          <div className="card p-3" key={idx}>
            <div className="row g-3">
              {fields.map((f) => (
                <div className={f.textarea ? "col-12" : "col-md-6"} key={f.key}>
                  <label htmlFor={`pf-${title}-${idx}-${f.key}`} className="form-label">{f.label}</label>
                  {f.textarea ? (
                    <textarea id={`pf-${title}-${idx}-${f.key}`} className={`form-control${errors?.[collectionKey]?.[idx]?.[f.key] ? ' is-invalid' : ''}`} rows={3} placeholder={f.label} value={item[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} />
                  ) : (
                    // switch date-like fields to date input
                    (f.key.toLowerCase().includes('date') ? (
                      <input id={`pf-${title}-${idx}-${f.key}`} type="date" className={`form-control${errors?.[collectionKey]?.[idx]?.[f.key] ? ' is-invalid' : ''}`} value={item[f.key] ? String(item[f.key]).split('T')[0] : ''} onChange={e => update(idx, f.key, e.target.value || '')} />
                    ) : (
                      <input id={`pf-${title}-${idx}-${f.key}`} className={`form-control${errors?.[collectionKey]?.[idx]?.[f.key] ? ' is-invalid' : ''}`} placeholder={f.label} value={item[f.key] || ''} onChange={e => update(idx, f.key, e.target.value)} />
                    ))
                  )}
                  {errors?.[collectionKey]?.[idx]?.[f.key] && (
                    <div className="invalid-feedback">{errors[collectionKey][idx][f.key]}</div>
                  )}
                </div>
              ))}
              <div className="col-12 text-end">
                <button className="btn btn-sm btn-outline-light" onClick={() => remove(idx)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
