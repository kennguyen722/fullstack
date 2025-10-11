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
  const [data, setData] = useState<any>({
    headline: '',
    summary: '',
    displayName: '',
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

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/profile/me');
        if (res.data.profile) setData(res.data.profile);
      } catch (err: any) {
        setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Validation helpers ---
  const isEmailValid = (s: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(s);
  const isUrlLike = (s: string) => /^https?:\/\//i.test(s) || /^www\./i.test(s) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/|$)/i.test(s);

  function validate(): boolean {
    const nextErrors: any = {};
    // simple fields
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

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      // client-side validation first
      if (!validate()) {
        setMessage({ type: 'danger', text: 'Please fix the highlighted fields.' });
        return;
      }
      await api.put('/profile/me', data);
      setMessage({ type: 'success', text: 'Profile saved' });
      // notify other tabs/components
      localStorage.setItem('profileUpdatedAt', String(Date.now()));
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err: any) {
      setMessage({ type: 'danger', text: err?.response?.data?.error || 'Failed to save profile' });
    } finally {
      setSaving(false);
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
        <div className="p-4 rounded border">
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="pf-headline" className="form-label">Headline</label>
              <input id="pf-headline" className="form-control" placeholder="Senior Software Engineer" value={data.headline || ''} onChange={e => setData({ ...data, headline: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label htmlFor="pf-displayname" className="form-label">Display name</label>
              <input id="pf-displayname" className="form-control" placeholder="Your name (sidebar title)" value={data.displayName || ''} onChange={e => setData({ ...data, displayName: e.target.value })} />
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
                  <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setData((p: any) => ({ ...p, photoUrl: '' }))}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="col-12">
              <label htmlFor="pf-summary" className="form-label">Summary</label>
              <textarea id="pf-summary" className="form-control" rows={3} placeholder="Short professional summary" value={data.summary || ''} onChange={e => setData({ ...data, summary: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-location" className="form-label">Location</label>
                    <input id="pf-location" className="form-control" placeholder="e.g., Remote · Worldwide" value={data.location || ''} onChange={e => setData({ ...data, location: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-address" className="form-label">Address</label>
                    <input id="pf-address" className="form-control" placeholder="Street, City, State/Province" value={data.address || ''} onChange={e => setData({ ...data, address: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-phone" className="form-label">Phone</label>
                    <input id="pf-phone" className="form-control" placeholder="e.g., +1 (555) 123-4567" value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-availability" className="form-label">Availability</label>
                    <input id="pf-availability" className="form-control" placeholder="e.g., Open to full-time roles" value={data.availability || ''} onChange={e => setData({ ...data, availability: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label htmlFor="pf-focus" className="form-label">Focus areas</label>
                    <input id="pf-focus" className="form-control" placeholder="e.g., Platform architecture · Developer experience · Applied AI" value={data.focusAreas || ''} onChange={e => setData({ ...data, focusAreas: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-email" className="form-label">Email</label>
                    <input id="pf-email" type="email" className={`form-control${errors.email ? ' is-invalid' : ''}`} placeholder="hello@example.com" value={data.email || ''} onChange={e => { setData({ ...data, email: e.target.value }); setErrors((prev:any) => ({ ...prev, email: undefined })); }} />
                    {errors.email && (<div className="invalid-feedback">{errors.email}</div>)}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-linkedin" className="form-label">LinkedIn URL</label>
                    <input id="pf-linkedin" type="url" className={`form-control${errors.linkedin ? ' is-invalid' : ''}`} placeholder="https://www.linkedin.com/in/your-profile" value={data.linkedin || ''} onChange={e => { setData({ ...data, linkedin: e.target.value || '' }); setErrors((prev:any) => ({ ...prev, linkedin: undefined })); }} />
                    {errors.linkedin && (<div className="invalid-feedback">{errors.linkedin}</div>)}
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="pf-github" className="form-label">GitHub URL</label>
                    <input id="pf-github" type="url" className={`form-control${errors.github ? ' is-invalid' : ''}`} placeholder="https://github.com/your-handle" value={data.github || ''} onChange={e => { setData({ ...data, github: e.target.value || '' }); setErrors((prev:any) => ({ ...prev, github: undefined })); }} />
                    {errors.github && (<div className="invalid-feedback">{errors.github}</div>)}
                  </div>

      <EditableSection title="Experience" collectionKey="experiences" errors={errors} onClearError={clearError} items={data.experiences} setItems={(items) => setData({ ...data, experiences: items })} fields={[
        { key: 'company', label: 'Company' },
        { key: 'role', label: 'Role' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'description', label: 'Description', textarea: true }
      ]} />

      <EditableSection title="Education" collectionKey="educations" errors={errors} onClearError={clearError} items={data.educations} setItems={(items) => setData({ ...data, educations: items })} fields={[
        { key: 'school', label: 'School' },
        { key: 'degree', label: 'Degree' },
        { key: 'field', label: 'Field' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'description', label: 'Description', textarea: true }
      ]} />

      <EditableSection title="Leadership" collectionKey="leaderships" errors={errors} onClearError={clearError} items={data.leaderships} setItems={(items) => setData({ ...data, leaderships: items })} fields={[
        { key: 'organization', label: 'Organization' },
        { key: 'title', label: 'Title' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'endDate', label: 'End Date' },
        { key: 'description', label: 'Description', textarea: true }
      ]} />

      <EditableSection title="Skills" collectionKey="skills" errors={errors} onClearError={clearError} items={data.skills} setItems={(items) => setData({ ...data, skills: items })} fields={[
        { key: 'description', label: 'Description', textarea: true }
      ]} />

      <div className="col-12">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</button>
      </div>
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
                <div className="col-md-6" key={f.key}>
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
