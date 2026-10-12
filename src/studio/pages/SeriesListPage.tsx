import { useCallback, useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageTaxonomies } from '../lib/cms/authorization';
import { slugifyTitle } from '../lib/slugifyTitle';
import type { UserProfile } from '../types';

type SeriesRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  sort_order: number;
};

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  sort_order: 0,
};

export default function SeriesListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const allowed = canManageTaxonomies(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('series')
      .select('id, name, slug, description, image_url, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows(
      ((data as SeriesRow[]) ?? []).map((r) => ({
        ...r,
        description: r.description ?? '',
        sort_order: Number(r.sort_order) || 0,
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

  function startEdit(row: SeriesRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      description: row.description,
      image_url: row.image_url ?? '',
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
        image_url: form.image_url.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };
      if (editingId === 'new') {
        const { error: insertError } = await supabase.from('series').insert(payload);
        if (insertError) throw insertError;
      } else if (editingId) {
        const { error: updateError } = await supabase.from('series').update(payload).eq('id', editingId);
        if (updateError) throw updateError;
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save series.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: SeriesRow) {
    if (!allowed || !window.confirm(`Delete series “${row.name}”? Editions stay published but unlinked.`)) {
      return;
    }
    const { error: deleteError } = await supabase.from('series').delete().eq('id', row.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingId === row.id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    await load();
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Series" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage series.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Series"
      titleIcon={<Layers size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Series</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Recurring publications such as This Week in Tech. An edition can also belong to topic
              categories.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            onClick={startCreate}
          >
            New series
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        {editingId ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
              {editingId === 'new' ? 'New series' : 'Edit series'}
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
                URL slug
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Image URL
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Display order
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
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
          {rows.length === 0 && !loading ? (
            <li className="p-6 text-sm text-slate-500">No series yet.</li>
          ) : null}
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  {row.name}{' '}
                  <span className="text-xs font-normal text-slate-400">/{row.slug}</span>
                </p>
                {row.description ? (
                  <p className="mt-1 text-sm text-slate-600">{row.description}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                  onClick={() => startEdit(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-600"
                  onClick={() => void remove(row)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
