import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageLeadMagnets } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type Magnet = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  active_version_id: string | null;
};

type Version = {
  id: string;
  version: number;
  media_id: string;
  label: string;
  created_at: string;
};

type PrivateMedia = { id: string; path: string; title: string | null; bucket: string };

type JobRow = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  contact_id: string;
};

export default function LeadMagnetEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { magnetId } = useParams<{ magnetId: string }>();
  const [magnet, setMagnet] = useState<Magnet | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [mediaOptions, setMediaOptions] = useState<PrivateMedia[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [mediaId, setMediaId] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const allowed = canManageLeadMagnets(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!magnetId) return;
    const { data, error: magError } = await supabase
      .from('lead_magnets')
      .select('id, title, slug, status, active_version_id')
      .eq('id', magnetId)
      .maybeSingle();
    if (magError || !data) {
      setError(magError?.message || 'Lead magnet not found.');
      setMagnet(null);
      return;
    }
    setMagnet(data as Magnet);

    const { data: vers } = await supabase
      .from('lead_magnet_versions')
      .select('id, version, media_id, label, created_at')
      .eq('lead_magnet_id', magnetId)
      .order('version', { ascending: false });
    setVersions((vers as Version[]) ?? []);

    const { data: media } = await supabase
      .from('media')
      .select('id, path, title, bucket')
      .eq('bucket', 'media-private')
      .order('created_at', { ascending: false })
      .limit(100);
    setMediaOptions((media as PrivateMedia[]) ?? []);

    const { data: jobRows } = await supabase
      .from('delivery_jobs')
      .select('id, status, attempts, last_error, sent_at, created_at, contact_id')
      .eq('lead_magnet_id', magnetId)
      .order('created_at', { ascending: false })
      .limit(30);
    setJobs((jobRows as JobRow[]) ?? []);
    setError(null);
  }, [magnetId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function saveMagnet() {
    if (!magnet || !allowed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase
        .from('lead_magnets')
        .update({
          title: magnet.title.trim() || 'Untitled lead magnet',
          slug: magnet.slug.trim().toLowerCase(),
          status: magnet.status,
          active_version_id: magnet.active_version_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magnet.id);
      if (saveError) throw saveError;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function addVersion() {
    if (!magnet || !mediaId || !allowed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const nextVersion = (versions[0]?.version ?? 0) + 1;
      const { data, error: insertError } = await supabase
        .from('lead_magnet_versions')
        .insert({
          lead_magnet_id: magnet.id,
          version: nextVersion,
          media_id: mediaId,
          label: versionLabel.trim() || `v${nextVersion}`,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      const { error: activateError } = await supabase
        .from('lead_magnets')
        .update({
          active_version_id: data?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', magnet.id);
      if (activateError) throw activateError;
      setMediaId('');
      setVersionLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add version.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Lead magnet" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage lead magnets.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Lead magnet"
      titleIcon={<Package size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/lead-magnets"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Lead magnets
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {magnet ? (
          <>
            <h1 className="mt-4 font-serif text-3xl font-black text-slate-900">Edit lead magnet</h1>
            <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Title
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={magnet.title}
                onChange={(e) => setMagnet({ ...magnet, title: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Slug
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={magnet.slug}
                onChange={(e) => setMagnet({ ...magnet, slug: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={magnet.status}
                onChange={(e) =>
                  setMagnet({ ...magnet, status: e.target.value === 'published' ? 'published' : 'draft' })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Active version
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={magnet.active_version_id || ''}
                onChange={(e) => setMagnet({ ...magnet, active_version_id: e.target.value || null })}
              >
                <option value="">None</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} {v.label ? `· ${v.label}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="mt-6 rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
              disabled={saving}
              onClick={() => void saveMagnet()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Add version</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a file from the media-private bucket.</p>
            {mediaOptions.length === 0 ? (
              <p className="mt-3 text-sm text-amber-800">
                No private media yet. Upload to the media-private bucket in Media first.
              </p>
            ) : (
              <>
                <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Private media
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                    value={mediaId}
                    onChange={(e) => setMediaId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {mediaOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title || m.path}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
                  Label
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                    value={versionLabel}
                    onChange={(e) => setVersionLabel(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <button
                  type="button"
                  className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                  disabled={saving || !mediaId}
                  onClick={() => void addVersion()}
                >
                  Add & activate version
                </button>
              </>
            )}

            <h2 className="mt-10 text-lg font-bold text-slate-900">Recent delivery jobs</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {jobs.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No jobs yet.</li>
              ) : (
                jobs.map((j) => (
                  <li key={j.id} className="px-4 py-3 text-sm">
                    <div className="font-semibold text-slate-900">
                      {j.status} · attempts {j.attempts}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(j.created_at).toLocaleString()}
                      {j.sent_at ? ` · sent ${new Date(j.sent_at).toLocaleString()}` : ''}
                    </div>
                    {j.last_error ? <div className="mt-1 text-xs text-red-700">{j.last_error}</div> : null}
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
