import { useCallback, useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import { slugifyTitle } from '../lib/slugifyTitle';
import type { UserProfile } from '../types';

type ListRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
};

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
};

export default function NewsletterListsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('newsletter_lists')
      .select('id, name, slug, description, is_active, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows(
      ((data as ListRow[]) ?? []).map((r) => ({
        ...r,
        description: r.description ?? '',
        sort_order: Number(r.sort_order) || 0,
        is_active: Boolean(r.is_active),
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

  function startCreate() {
    setEditingId('new');
    setForm(emptyForm);
  }

  function startEdit(row: ListRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description,
      is_active: row.is_active,
      sort_order: row.sort_order,
    });
  }

  async function save() {
    if (!allowed || saving) return;
    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }
    const slug = (form.slug.trim() || slugifyTitle(name)).toLowerCase();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        slug,
        description: form.description.trim(),
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };
      if (editingId === 'new') {
        const { error: insertError } = await supabase.from('newsletter_lists').insert(payload);
        if (insertError) throw insertError;
      } else if (editingId) {
        const { error: updateError } = await supabase
          .from('newsletter_lists')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save email publication.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Email publications" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage email publications.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Email publications"
      titleIcon={<ListChecks size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Newsletter preferences</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Email publications readers can subscribe to. Topic interests on contacts stay separate —
              liking AI does not subscribe someone to AI Updates.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            onClick={startCreate}
          >
            New publication
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        {editingId ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {editingId === 'new' ? 'New publication' : 'Edit publication'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.slug || slugifyTitle(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Slug
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </label>
            </div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              Description
              <textarea
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active (offer on preference forms)
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Order
                <input
                  type="number"
                  className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {row.name}{' '}
                  <span className="text-xs font-normal text-slate-400">/{row.slug}</span>
                  {!row.is_active ? (
                    <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-amber-600">
                      inactive
                    </span>
                  ) : null}
                </p>
                {row.description ? (
                  <p className="mt-1 text-sm text-slate-600">{row.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                onClick={() => startEdit(row)}
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
