import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageLeadMagnets } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type LeadMagnetRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  active_version_id: string | null;
  updated_at: string;
};

export default function LeadMagnetsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<LeadMagnetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allowed = canManageLeadMagnets(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('lead_magnets')
      .select('id, title, slug, status, active_version_id, updated_at')
      .order('updated_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as LeadMagnetRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createMagnet() {
    if (!allowed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const slug = `lead-magnet-${Date.now().toString(36)}`;
      const { data, error: insertError } = await supabase
        .from('lead_magnets')
        .insert({ title: 'Untitled lead magnet', slug, status: 'draft' })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/lead-magnets/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create lead magnet.');
    } finally {
      setCreating(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Lead magnets" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage lead magnets.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Lead magnets"
      titleIcon={<Package size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Lead magnets</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Versioned private downloads delivered through the outbox. Kit signup and subscribers stay separate.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            disabled={creating}
            onClick={() => void createMagnet()}
          >
            {creating ? 'Creating…' : 'New lead magnet'}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/lead-magnets/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{row.title}</div>
                  <div className="text-xs text-slate-500">
                    {row.slug} · {row.status}
                    {row.active_version_id ? '' : ' · no active version'}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
        {!loading && rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No lead magnets yet. Create one and attach a media-private file.</p>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
