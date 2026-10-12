import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Import } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageImports } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type ImportJobRow = {
  id: string;
  source: string;
  status: string;
  summary: Record<string, number>;
  created_at: string;
  finished_at: string | null;
};

export default function ImportsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<ImportJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allowed = canManageImports(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('import_jobs')
      .select('id, source, status, summary, created_at, finished_at')
      .order('created_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as ImportJobRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createKitImport() {
    if (!allowed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('import_jobs')
        .insert({
          source: 'kit_subscribers',
          status: 'draft',
          mapping: { email: 'email', first_name: 'first_name', unsubscribed_at: 'unsubscribed_at' },
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/imports/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create import job.');
    } finally {
      setCreating(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Imports" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage imports.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Imports"
      titleIcon={<Import size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Import jobs</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Dry-run kit subscribers into Contacts, review counts, then commit once. Kit rows are never deleted;
              suppression is preserved.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            disabled={creating}
            onClick={() => void createKitImport()}
          >
            {creating ? 'Creating…' : 'New kit import'}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/imports/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{row.source}</div>
                  <div className="text-xs text-slate-500">
                    {row.status}
                    {typeof row.summary?.total === 'number' ? ` · ${row.summary.total} rows` : ''}
                    {typeof row.summary?.wouldWrite === 'number' ? ` · ${row.summary.wouldWrite} would write` : ''}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span>
              </Link>
            </li>
          ))}
          {!loading && rows.length === 0 ? (
            <li className="px-4 py-8 text-sm text-slate-500">No import jobs yet.</li>
          ) : null}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
