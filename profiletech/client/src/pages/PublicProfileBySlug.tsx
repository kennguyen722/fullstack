import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../shared/api';

export default function PublicProfileBySlug() {
  const { slug } = useParams();
  const s = useMemo(() => (slug || '').toString().trim().toLowerCase(), [slug]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setProfile(null);
      try {
        if (!s) throw new Error('Missing profile name');
        const res = await api.get(`/profile/slug/${encodeURIComponent(s)}`);
        setProfile(res.data?.profile || null);
      } catch (e: any) {
        setErr(e?.response?.data?.error || 'Profile not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [s]);

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (err) return <div className="alert alert-warning">{err}</div>;
  if (!profile) return <div className="alert alert-warning">Profile not found</div>;

  return (
    <div className="py-4">
      <div className="container">
        <h2 className="accent mb-2">{profile.displayName || 'Profile'}</h2>
        {profile.headline && <div className="text-soft mb-3">{profile.headline}</div>}
        <div className="card p-3 shadow-sm">
          <div className="row g-3 align-items-start">
            <div className="col-md-8">
              <h4 className="accent">Professional Summary</h4>
              <p className="mb-0 text-muted-2">{profile.summary}</p>
            </div>
            {profile.photoUrl && (
              <div className="col-md-4">
                <img src={profile.photoUrl} alt={profile.displayName || 'Profile photo'} className="img-fluid rounded" />
              </div>
            )}
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-body">
            <h4 className="accent mb-2">Experience</h4>
            {Array.isArray(profile.experiences) && profile.experiences.length ? (
              <ul className="mb-0">
                {profile.experiences.map((e: any, i: number) => (
                  <li key={i} className="mb-2">
                    <strong className="text-bright">{e.role}</strong> <span className="badge badge-company ms-2">{e.company}</span>
                  </li>
                ))}
              </ul>
            ) : <div className="text-muted-2">No experience listed</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
