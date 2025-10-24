import { useState, useEffect } from 'react';
import { useConfig } from '../../shared/ConfigContext';
import { api } from '../../shared/api';
import { ThemeSelect } from '../../shared/ThemeToggle';
import { useTheme } from '../../shared/ThemeContext';

export default function ApplicationSettings() {
  const { config, updateConfig } = useConfig();
  const { theme: currentTheme } = useTheme();
  const [local, setLocal] = useState({ appTitle: config.appTitle, tagline: config.tagline || '', theme: config.theme || currentTheme || 'dark' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // keep local form state in sync if config changes elsewhere
  useEffect(() => {
    setLocal(l => ({ ...l, appTitle: config.appTitle, tagline: config.tagline || '', theme: config.theme || currentTheme }));
  }, [config, currentTheme]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Persist to server if API supports it (non-blocking)
      await api.post('/settings', local).catch(() => {});
      // Update global config (only keys that exist on AppConfig will be merged)
      updateConfig({ appTitle: local.appTitle, tagline: local.tagline, theme: local.theme } as any);
      setMessage('Settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err:any) {
      console.error(err);
      setMessage('Failed to save settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="mb-3">Application Settings</h5>
        {message && <div className="alert alert-info">{message}</div>}
        <form onSubmit={handleSave}>
          <div className="row mb-3">
            <div className="col-md-12">
              <label className="form-label"><i className="bi bi-tag me-2"></i>Application Title</label>
              <input type="text" aria-label="Application title" placeholder="My Salon Booking" className="form-control" value={local.appTitle} onChange={(e)=>setLocal({...local, appTitle: e.target.value})} />
              <div className="form-text">This updates the app title displayed in the header and document title.</div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-12">
              <label className="form-label"><i className="bi bi-card-text me-2"></i>Tagline</label>
              <input type="text" aria-label="Application tagline" placeholder="Centralized booking & business insights" className="form-control" value={local.tagline} onChange={(e)=>setLocal({...local, tagline: e.target.value})} />
              <div className="form-text">Short tagline shown under the title.</div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-12">
              <label className="form-label"><i className="bi bi-palette me-2"></i>Theme</label>
              <div>
                <ThemeSelect showAsCards={true} />
              </div>
              <div className="form-text mt-2">Select the look-and-feel for the application. Changes apply immediately.</div>
            </div>
          </div>

          <div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
