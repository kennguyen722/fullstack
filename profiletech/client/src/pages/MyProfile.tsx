import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../shared/ToastContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../shared/api';

export default function MyProfile() {
  const params = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  // used to bust image cache when photo changes
  const [photoNonce, setPhotoNonce] = useState<number>(0);
  const [expOpen, setExpOpen] = useState(true);
  // Contact modal state
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState<boolean | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const NAV_OFFSET = 84; // account for sticky navbar height
  const { showToast } = useToast();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const formatDate = (d?: string) =>
    d ? (d.includes('T') ? d.split('T')[0] : d) : '';

  const splitBullets = (desc?: string): string[] => {
    if (!desc) return [];
    const clean = desc.replace(/\r/g, '');
    let parts: string[] = [];
    if (clean.includes('\n')) {
      parts = clean.split(/\n+/);
    } else if (clean.includes('•')) {
      parts = clean.split('•');
    } else if (clean.includes(';')) {
      parts = clean.split(';');
    } else {
      // try split on period followed by space if multiple sentences
      const maybe = clean.split(/\.\s+/);
      parts = maybe.length > 1 ? maybe : [clean];
    }
    return parts.map(p => p.trim()).filter(Boolean);
  };

  // Determine if a specific profile id was requested
  const requestedId = useMemo(() => {
    const idStr = params.id;
    const id = idStr ? Number(idStr) : undefined;
    return id && !Number.isNaN(id) ? id : undefined;
  }, [params.id]);

  // fetch helper so we can reuse on events
  async function refetchProfile() {
    try {
      let url = '';
      if (requestedId) {
        url = `/profile/${requestedId}`;
      } else {
        const token = localStorage.getItem('token');
        url = token ? '/profile/me' : '/profile/public';
      }
      const res = await api.get(url);
      setProfile(res.data.profile);
      // bump nonce to force <img> reload if photo changed
      setPhotoNonce(Date.now());
    } catch (e) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    refetchProfile();
    // load login email from localStorage
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.email) setLoginEmail(String(u.email));
      }
    } catch {}
    // live updates when Profile page saves or uploads
    const onProfileUpdated = () => refetchProfile();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'profileUpdatedAt') refetchProfile();
      if (ev.key === 'user') {
        try {
          const u = ev.newValue ? JSON.parse(ev.newValue) : null;
          setLoginEmail(u?.email || null);
        } catch { setLoginEmail(null); }
      }
    };
    const onAuthChanged = () => {
      try {
        const raw = localStorage.getItem('user');
        const u = raw ? JSON.parse(raw) : null;
        setLoginEmail(u?.email || null);
      } catch { setLoginEmail(null); }
    };
  window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    return () => {
      window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
    };
  }, [requestedId]);

  // Close contact modal on Escape
  useEffect(() => {
    if (!showContact) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowContact(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showContact]);

  function openContact() {
    setSendError(null);
    setSentOk(null);
    // prefill email from logged in account if available
    setContactEmail(loginEmail || '');
    setShowContact(true);
  }

  function closeContact() {
    if (sending) return; // prevent closing while sending
    setShowContact(false);
  }

  async function submitContact(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSendError(null);
    setSentOk(null);
    const email = contactEmail.trim();
    const message = contactMessage.trim();
    const name = contactName.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
      setSendError('Please enter a valid email.');
      return;
    }
    if (!message || message.length < 5) {
      setSendError('Your message is too short.');
      return;
    }
    try {
      setSending(true);
      await api.post('/contact', { name, email, message });
  setSentOk(true);
  showToast('Your message has been sent.', 'success');
      // clear
      setContactName('');
      setContactMessage('');
      // close after a short delay
      setTimeout(() => setShowContact(false), 900);
    } catch (err: any) {
  const msg = err?.response?.data?.error || 'Failed to send your message.';
      setSendError(String(msg));
      setSentOk(false);
  showToast(String(msg), 'error');
    } finally {
      setSending(false);
    }
  }

  // If no :id provided, try to navigate to the correct canonical id to avoid mismatches
  useEffect(() => {
    (async () => {
      if (requestedId) return;
      try {
        // Prefer own profile when logged in, otherwise public
        const token = localStorage.getItem('token');
        const res = await api.get(token ? '/profile/me' : '/profile/public');
        const prof = res.data?.profile;
        if (prof?.id) {
          navigate(`/myprofile/${prof.id}`, { replace: true });
        }
      } catch {}
    })();
  }, [requestedId, navigate]);

  if (loading) return <div className="text-center py-5">Loading profile...</div>;
  if (!profile) return <div className="alert alert-warning">No profile data available.</div>;

  return (
    <div className="py-4 dashboard-wrap">
      <div className="container">
        <div className="row g-3">
          {/* Side Nav (md and up) */}
          <aside className="col-md-3 d-none d-md-block">
            <div className="side-stack">
            {loginEmail && (
              <div className="facts-panel p-2 rounded-3 mb-2" aria-label="Account">
                <div className="facts-title text-soft mb-1 d-flex align-items-center gap-2">
                  <span>Account</span>
                  <span className="badge-accent">Login</span>
                </div>
                <div className="small text-bright" title="Logged-in email">{loginEmail}</div>
              </div>
            )}
            <nav className="side-nav panel shadow-sm mb-2">
              <div className="side-title">Navigation</div>
              <ul className="list-unstyled mb-0">
                <li>
                  <button className="side-link" onClick={() => scrollToId('overview')}>
                    <span className="nav-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 10.5V20h5v-5h4v5h5v-9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span>Professional Summary</span>
                  </button>
                </li>
                <li className="mt-1">
                  <button className="side-link" onClick={() => scrollToId('skills')}>
                    <span className="nav-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span>Core Technical Skills</span>
                  </button>
                </li>
                <li className="mt-1">
                  <button className="side-link d-flex justify-content-between align-items-center" onClick={() => setExpOpen(v => !v)}>
                    <span className="d-inline-flex align-items-center gap-2">
                      <span className="nav-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 7h10a2 2 0 0 1 2 2v7H5V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M9 7V6a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </span>
                      <span>Professional Experience</span>
                    </span>
                    <span className={`chevron ${expOpen ? 'open' : ''}`} aria-hidden>▸</span>
                  </button>
                  {expOpen && (
                    <ul className="list-unstyled ms-2 mt-1">
                      {profile.experiences?.length ? (
                        profile.experiences.map((e: any, i: number) => (
                          <li key={`exp-li-${i}`}>
                            <button className="side-sub-link" onClick={() => scrollToId(`exp-${i}`)}>
                              <span className="nav-icon sub" aria-hidden>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </span>
                              <span>{e.role || e.company || `Experience ${i + 1}`}</span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="text-muted-2 small ms-2">No items</li>
                      )}
                    </ul>
                  )}
                </li>
                <li className="mt-1">
                  <button className="side-link" onClick={() => scrollToId('leadership')}>
                    <span className="nav-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 10v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M16 11a3 3 0 1 0 0-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <span>Freelance & Leadership</span>
                  </button>
                </li>
                <li className="mt-1">
                  <button className="side-link" onClick={() => scrollToId('education')}>
                    <span className="nav-icon" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4l10 6-10 6L2 10l10-6Z" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 12v4c2 2 10 2 12 0v-4" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </span>
                    <span>Education</span>
                  </button>
                </li>
              </ul>
            </nav>
            {(profile.address || profile.location || profile.phone || profile.email) && (
              <div className="facts-panel p-2 rounded-3 mb-2" aria-label="Contact information">
                <div className="facts-title text-soft mb-1 d-flex align-items-center gap-2">
                  <span>Contact</span>
                  <span className="badge-accent">Info</span>
                </div>
                <ul className="list-unstyled fact-list mb-0">
                  {profile.phone && (
                    <li className="py-1 d-flex align-items-start gap-2">
                      <span className="fact-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.25 6.75c0 8.284 6.716 15 15 15H19.5a2.25 2.25 0 0 0 2.25-2.25v-1.372a1.125 1.125 0 0 0-.852-1.09l-4.548-1.137a1.125 1.125 0 0 0-1.173.417l-.97 1.293a.75.75 0 0 1-.82.257 12.035 12.035 0 0 1-7.048-7.048.75.75 0 0 1 .257-.82l1.293-.97a1.125 1.125 0 0 0 .417-1.173L6.962 3.102a1.125 1.125 0 0 0-1.09-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <a className="text-bright small" href={`tel:${profile.phone}`}>{profile.phone}</a>
                    </li>
                  )}
                  {profile.email && (
                    <li className="py-1 d-flex align-items-start gap-2">
                      <span className="fact-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.917l-7.5 4.5a2.25 2.25 0 0 1-2.16 0l-7.5-4.5A2.25 2.25 0 0 1 2.25 6.993V6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <a className="text-bright small" href={`mailto:${profile.email}`}>{profile.email}</a>
                    </li>
                  )}
                  {(profile.address || profile.location) && (
                    <li className="py-1 d-flex align-items-start gap-2">
                      <span className="fact-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19.5 10.5c0 7.5-7.5 10.5-7.5 10.5S4.5 18 4.5 10.5a7.5 7.5 0 1 1 15 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span className="text-bright small">{profile.address || profile.location}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {(profile.location || profile.availability || profile.focusAreas) && (
              <div className="facts-panel p-2 rounded-3 mb-2" aria-label="Quick facts">
                <div className="facts-title text-soft mb-1 d-flex align-items-center gap-2">
                  <span>Quick facts</span>
                  <span className="badge-accent">Info</span>
                </div>
                <ul className="list-unstyled fact-list mb-0">
                  {profile.location && (
                    <li className="d-flex justify-content-between align-items-center py-1">
                      <span className="text-soft d-flex align-items-center gap-2">
                        <span className="fact-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.5 10.5c0 7.5-7.5 10.5-7.5 10.5S4.5 18 4.5 10.5a7.5 7.5 0 1 1 15 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span>Location</span>
                      </span>
                      <span className="text-bright fw-semibold text-end ms-3">{profile.location}</span>
                    </li>
                  )}
                  {profile.availability && (
                    <li className="d-flex justify-content-between align-items-center py-1">
                      <span className="text-soft d-flex align-items-center gap-2">
                        <span className="fact-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span>Availability</span>
                      </span>
                      <span className="text-bright fw-semibold text-end ms-3">{profile.availability}</span>
                    </li>
                  )}
                  {profile.focusAreas && (
                    <li className="d-flex justify-content-between align-items-center py-1">
                      <span className="text-soft d-flex align-items-center gap-2">
                        <span className="fact-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
                          </svg>
                        </span>
                        <span>Focus areas</span>
                      </span>
                      <span className="text-bright fw-semibold text-end ms-3">{profile.focusAreas}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-12 col-md-9">
            {/* Header */}
            <div className="row" id="overview">
              <div className="col-12">
                <div className="p-4 rounded-3 shadow-sm panel section-anchor">
                  <div className="row g-3 align-items-start">
                    <div className="col-12 col-lg-8">
                      <h2 className="mb-2 accent">Professional Summary</h2>
                      <p className="mb-3 text-muted-2">{profile.summary}</p>
                    </div>
                    {profile.photoUrl && (
                      <div className="col-12 col-lg-4">
                        <div className="photo-frame">
                          <img
                            src={`${profile.photoUrl}${profile.photoUrl.includes('?') ? '&' : '?'}v=${photoNonce}`}
                            alt={profile.displayName || 'Profile photo'}
                            className="photo-card-img"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {(profile.linkedin || profile.github || true) && (
                    <div className="mt-3 d-flex flex-wrap gap-2">
                      <button type="button" className="btn btn-primary btn-sm" onClick={openContact}>Contact me</button>
                      {profile.linkedin && (
                        <a className="btn btn-outline-light btn-sm" target="_blank" rel="noreferrer" href={profile.linkedin}>LinkedIn</a>
                      )}
                      {profile.github && (
                        <a className="btn btn-outline-light btn-sm" target="_blank" rel="noreferrer" href={profile.github}>GitHub</a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Skills Row (moved above Experience) */}
            <div className="row g-3 mt-3" id="skills">
              <div className="col-12">
                <div className="card shadow-sm section-anchor">
                  <div className="card-body">
                    <h4 className="mb-2 accent d-flex align-items-center gap-2">
                      <span className="section-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 8.25a4.5 4.5 0 0 1 6.364 0l11.136 11.136a1.5 1.5 0 0 1-2.121 2.121L7.243 10.371A4.5 4.5 0 0 1 3 8.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12.75 3.75l7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Core Technical Skills</span>
                      <span className="badge-accent">Stack</span>
                    </h4>
                    {(() => {
                      const items = Array.isArray(profile.skills)
                        ? profile.skills.flatMap((s: any) => {
                            const desc = (s?.description ?? '').toString();
                            const parts = splitBullets(desc);
                            return parts.length ? parts : (desc ? [desc] : []);
                          })
                        : [];
                      if (!items.length) return <div className="accent">No skills listed</div>;
                      return (
                        <ul className="list-unstyled mb-0">
                          {items.map((it: string, i: number) => (
                            <li key={i} className="d-flex align-items-start mb-1">
                              <span className="me-2 text-accent" aria-hidden="true">•</span>
                              <span className="text-bright">{it}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Experience (single card with header) */}
            <div className="row g-3 mt-3" id="experience">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h4 className="accent mb-2 section-anchor d-flex align-items-center gap-2">
                      <span className="section-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 7V6a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M4.5 10.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3V18a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 18v-7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Professional Experience</span>
                      <span className="badge-accent">Projects</span>
                    </h4>
                    {profile.experiences?.length ? (
                      <div className="vstack">
                        {profile.experiences.map((e: any, i: number) => (
                          <div className="section-item" key={`exp-${i}`} id={`exp-${i}`}>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong className="text-bright">{e.role}</strong>
                              <span className="badge badge-company">{e.company}</span>
                            </div>
                            <div className="small text-soft">{formatDate(e.startDate)} - {e.endDate ? formatDate(e.endDate) : 'Present'}</div>
                            {(() => {
                              const items = splitBullets(e.description);
                              if (!items.length) return <p className="mb-0 mt-2 text-bright">{e.description}</p>;
                              return (
                                <ul className="list-unstyled mb-0 mt-2">
                                  {items.map((it, idx) => (
                                    <li key={idx} className="d-flex align-items-start mb-1">
                                      <span className="me-2 text-accent" aria-hidden="true">•</span>
                                      <span className="text-bright">{it}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="accent">No experience listed</div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Leadership (single card with header) */}
            <div className="row g-3 mt-3" id="leadership">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h4 className="accent mb-2 section-anchor d-flex align-items-center gap-2">
                      <span className="section-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.5 12.75 9.75 15a3 3 0 0 0 4.5 0l1.5-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2.25 8.25h5.25a4.5 4.5 0 0 1 3.182 1.318l.568.567a1.5 1.5 0 0 0 2.121 0l.568-.567A4.5 4.5 0 0 1 17.121 8.25H21.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Freelance & Leadership Experience</span>
                      <span className="badge-accent">Highlights</span>
                    </h4>
                    {profile.leaderships?.length ? (
                      <div className="vstack">
                        {profile.leaderships.map((l: any, i: number) => (
                          <div className="section-item" key={`lead-${i}`}>
                            <strong className="text-bright">{l.title}</strong>
                            <div className="small text-soft">{l.organization} • {formatDate(l.startDate)} - {l.endDate ? formatDate(l.endDate) : 'Present'}</div>
                            {(() => {
                              const items = splitBullets(l.description);
                              if (!items.length) return <p className="mb-0 mt-2 text-bright">{l.description}</p>;
                              return (
                                <ul className="list-unstyled mb-0 mt-2">
                                  {items.map((it, idx) => (
                                    <li key={idx} className="d-flex align-items-start mb-1">
                                      <span className="me-2 text-accent" aria-hidden="true">•</span>
                                      <span className="text-bright">{it}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="accent">No leadership listed</div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Education (single card with header) - moved below Skills */}
            <div className="row g-3 mt-3" id="education">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body">
                    <h4 className="accent mb-2 section-anchor d-flex align-items-center gap-2">
                      <span className="section-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4.5 21 9.75 12 15 3 9.75 12 4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 12.75v3c2 2 10 2 12 0v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <span>Education</span>
                      <span className="badge-accent">Academic</span>
                    </h4>
                    {profile.educations?.length ? (
                      <div className="vstack">
                        {profile.educations.map((ed: any, i: number) => (
                          <div className="section-item" key={`edu-${i}`}>
                            <strong className="text-bright">{ed.degree} in {ed.field}</strong>
                            <div className="small text-soft">{ed.school} • {formatDate(ed.startDate)} - {ed.endDate ? formatDate(ed.endDate) : 'Present'}</div>
                            <p className="mb-0 mt-2 text-bright">{ed.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="accent">No education listed</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {showContact && (
        <div
          className="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeContact();
          }}
        >
          <div className="card shadow contact-card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h5 id="contact-title" className="mb-0 accent">Contact me</h5>
                <button type="button" className="btn btn-sm btn-outline-light" onClick={closeContact} disabled={sending} aria-label="Close">✕</button>
              </div>
              <form onSubmit={submitContact}>
                <div className="mb-2">
                  <label className="form-label small text-soft">Your name (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Doe"
                    autoFocus
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small text-soft">Your email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small text-soft">Message</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Hi, I’m interested in working together..."
                    required
                  />
                </div>
                {sendError && <div className="alert alert-danger py-2 mb-2">{sendError}</div>}
                {sentOk && <div className="alert alert-success py-2 mb-2">Thanks! Your message has been sent.</div>}
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-outline-light" onClick={closeContact} disabled={sending}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? 'Sending…' : 'Send message'}
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
