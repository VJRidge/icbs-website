import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageSegments } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type SegmentRow = {
  id: string;
  name: string;
  description: string;
  list_kind: 'dynamic' | 'static';
  updated_at: string;
};

export default function SegmentsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<SegmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<'dynamic' | 'static' | null>(null);

  const allowed = canManageSegments(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('audience_segments')
      .select('id, name, description, list_kind, updated_at')
      .order('updated_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows(
      ((data as SegmentRow[]) ?? []).map((r) => ({
        ...r,
        list_kind: r.list_kind === 'static' ? 'static' : 'dynamic',
      })),
    );
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createList(listKind: 'dynamic' | 'static') {
    if (!allowed || creating) return;
    setCreating(listKind);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('audience_segments')
        .insert({
          name: listKind === 'static' ? 'Untitled uploaded list' : 'Untitled rule list',
          description: '',
          list_kind: listKind,
          definition: { match: 'all', rules: [] },
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/segments/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create list.');
    } finally {
      setCreating(null);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contact lists" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contact lists.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Contact lists"
      titleIcon={<Filter size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Contact lists</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Rule lists filter Contacts by tags/forms. Uploaded lists take CSV membership. Newsletter send
              always freezes marketing-ok, non-suppressed contacts only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
              disabled={Boolean(creating)}
              onClick={() => void createList('dynamic')}
            >
              {creating === 'dynamic' ? 'Creating…' : 'New rule list'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
              disabled={Boolean(creating)}
              onClick={() => void createList('static')}
            >
              {creating === 'static' ? 'Creating…' : 'New uploaded list'}
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/segments/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-500">
                    {row.list_kind === 'static' ? 'Uploaded list' : 'Rule list'}
                    {row.description ? ` · ${row.description}` : ''}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{new Date(row.updated_at).toLocaleString()}</span>
              </Link>
            </li>
          ))}
          {!loading && rows.length === 0 ? (
            <li className="px-4 py-8 text-sm text-slate-500">No contact lists yet.</li>
          ) : null}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
