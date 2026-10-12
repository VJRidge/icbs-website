import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageCampaigns } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type CampaignRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  ready_at: string | null;
};

export default function CampaignsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allowed = canManageCampaigns(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('campaigns')
      .select('id, title, slug, status, updated_at, ready_at')
      .order('updated_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as CampaignRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createCampaign() {
    if (!allowed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const slug = `campaign-${Date.now().toString(36)}`;
      const { data, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          title: 'Untitled campaign',
          slug,
          status: 'draft',
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/campaigns/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create campaign.');
    } finally {
      setCreating(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Campaigns" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage campaigns.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Campaigns"
      titleIcon={<Megaphone size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Campaign blueprints</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Link pages, forms, lead magnets, and newsletter issues. Blueprints do not send mail; book checkout is
              separate under Sales / `/api/checkout`.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            disabled={creating}
            onClick={() => void createCampaign()}
          >
            {creating ? 'Creating…' : 'New campaign'}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/campaigns/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{row.title}</div>
                  <div className="text-xs text-slate-500">
                    {row.slug} · {row.status}
                    {row.ready_at ? ` · ready ${new Date(row.ready_at).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
        {!loading && rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No campaigns yet.</p>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
