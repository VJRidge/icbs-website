import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageForms } from '../lib/cms/authorization';
import { emptyFormDraft, slugifyFormTitle } from '../lib/forms/formDraft';
import type { UserProfile } from '../types';

type FormListRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  version: number;
  updated_at: string;
};

export default function FormsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<FormListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allowed = canManageForms(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('forms')
      .select('id, title, slug, status, version, updated_at')
      .order('updated_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as FormListRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createForm() {
    if (!allowed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const draft = emptyFormDraft();
      const slugBase = slugifyFormTitle(`${draft.title}-${Date.now().toString(36)}`);
      const { data, error: insertError } = await supabase
        .from('forms')
        .insert({
          title: draft.title,
          slug: slugBase,
          status: 'draft',
          version: 1,
          fields: draft.fields,
          settings: draft.settings,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/forms/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create form.');
    } finally {
      setCreating(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Forms" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage forms.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell title="Forms" titleIcon={<ClipboardList size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Forms</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Lead capture stores submissions and marketing consent only. It does not send the kit email or write to
              subscribers.
            </p>
          </div>
          <button
            type="button"
            disabled={creating}
            onClick={() => void createForm()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-60"
          >
            <Plus size={14} /> {creating ? 'Creating…' : 'Add form'}
          </button>
        </div>
        {error ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No forms yet.</p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {rows.map((row) => (
              <li key={row.id}>
                <Link to={`/admin/forms/${row.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">
                      /{row.slug} · v{row.version}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    {row.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminCmsShell>
  );
}
