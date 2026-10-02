import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { kindConfig } from '../lib/contentKinds';
import type { UserProfile } from '../types';

type RedirectRow = { id: string; from_path: string; to_path: string; status_code: number };
type SeoRow = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  status: string;
};

export default function SiteSeoPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [suffix, setSuffix] = useState('I Call BS');
  const [description, setDescription] = useState('');
  const [prevStyles, setPrevStyles] = useState<Record<string, unknown>>({});
  const [redirects, setRedirects] = useState<RedirectRow[]>([]);
  const [pages, setPages] = useState<SeoRow[]>([]);
  const [fromPath, setFromPath] = useState('');
  const [toPath, setToPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [{ data: settings, error: sErr }, { data: reds, error: rErr }, { data: contents, error: cErr }] = await Promise.all([
      supabase.from('settings').select('site_description, global_styles').eq('id', 1).maybeSingle(),
      supabase.from('redirects').select('id, from_path, to_path, status_code').order('from_path'),
      supabase.from('contents').select('id, kind, title, slug, seo_title, seo_description, status').neq('status', 'trash').order('title'),
    ]);
    if (sErr || rErr || cErr) {
      setError((sErr || rErr || cErr)?.message ?? 'Could not load SEO data.');
      setLoading(false);
      return;
    }
    const styles = (settings?.global_styles ?? {}) as Record<string, unknown>;
    setPrevStyles(styles);
    setSuffix(typeof styles.seoTitleSuffix === 'string' && styles.seoTitleSuffix ? styles.seoTitleSuffix : 'I Call BS');
    setDescription(settings?.site_description ?? '');
    setRedirects((reds as RedirectRow[]) ?? []);
    setPages(
      ((contents as { id: string; kind: string; title: string; slug: string; seo_title: string | null; seo_description: string | null; status: string }[]) ?? []).map(
        (p) => ({
          ...p,
          seo_title: p.seo_title || '',
          seo_description: p.seo_description || '',
        }),
      ),
    );
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile]);

  const saveDefaults = async () => {
    setSaving(true);
    const nextStyles = { ...prevStyles, seoTitleSuffix: suffix.trim() || 'I Call BS' };
    const { error: saveError } = await supabase
      .from('settings')
      .update({
        site_description: description.trim() || null,
        global_styles: nextStyles,
      })
      .eq('id', 1);
    setSaving(false);
    if (saveError) window.alert(saveError.message);
    else setPrevStyles(nextStyles);
  };

  const saveRow = async (row: SeoRow) => {
    setRowSaving(row.id);
    const seoTitle = row.seo_title.trim() || null;
    const seoDescription = row.seo_description.trim() || null;
    const { error: saveError } = await supabase
      .from('contents')
      .update({
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo: { title: seoTitle, description: seoDescription },
      })
      .eq('id', row.id);
    setRowSaving(null);
    if (saveError) window.alert(saveError.message);
  };

  const addRedirect = async () => {
    const from = fromPath.trim().startsWith('/') ? fromPath.trim() : `/${fromPath.trim()}`;
    const to = toPath.trim().startsWith('http') || toPath.trim().startsWith('/') ? toPath.trim() : `/${toPath.trim()}`;
    if (!from || from === '/' || !to) {
      window.alert('Enter a from path (not /) and a destination.');
      return;
    }
    const { error: insertError } = await supabase.from('redirects').insert({ from_path: from, to_path: to, status_code: 301 });
    if (insertError) {
      window.alert(insertError.code === '23505' ? 'That from-path already has a redirect.' : insertError.message);
      return;
    }
    setFromPath('');
    setToPath('');
    await load();
  };

  const removeRedirect = async (id: string) => {
    const { error: delError } = await supabase.from('redirects').delete().eq('id', id);
    if (delError) window.alert(delError.message);
    else setRedirects((rows) => rows.filter((r) => r.id !== id));
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="font-semibold text-slate-700">Administrator access required.</p>
      </div>
    );
  }

  return (
    <AdminCmsShell
      title="SEO & redirects"
      titleIcon={<Search size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900">SEO & redirects</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Site-wide tab suffix, per-page titles, and in-browser redirects when a URL moves.
          </p>
        </div>
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-black text-slate-900">Defaults</h2>
              <p className="text-xs text-slate-500">
                Preview: About — {suffix || 'I Call BS'}
              </p>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Title suffix
                <input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Default description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDefaults()}
                className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save defaults'}
              </button>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-black text-slate-900">Redirects</h2>
              <p className="text-sm text-slate-600">
                Visitors who hit the old path are sent to the new one. Changing a published slug also adds a row here.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={fromPath}
                  onChange={(e) => setFromPath(e.target.value)}
                  placeholder="/old-slug"
                  className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-blue/40"
                />
                <input
                  value={toPath}
                  onChange={(e) => setToPath(e.target.value)}
                  placeholder="/about or https://…"
                  className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-blue/40"
                />
                <button
                  type="button"
                  onClick={() => void addRedirect()}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              {pages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pages
                    .filter((p) => p.status === 'published')
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setToPath(kindConfig(p.kind).publicPath(p.slug))}
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                      >
                        → {p.title}
                      </button>
                    ))}
                </div>
              ) : null}
              {redirects.length === 0 ? (
                <p className="text-sm text-slate-500">None yet. Add one above, or rename a published slug in the editor.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {redirects.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2">
                      <span className="font-mono text-xs text-slate-600">{r.from_path}</span>
                      <span className="text-slate-300">→</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-blue">{r.to_path}</span>
                      <button type="button" onClick={() => void removeRedirect(r.id)} className="p-1 text-red-500" aria-label="Delete redirect">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="font-serif text-xl font-black text-slate-900">Per-page SEO</h2>
                <p className="mt-1 text-sm text-slate-500">Edit here or in each page editor. Empty SEO title falls back to the page title.</p>
              </div>
              {pages.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No pages or posts yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pages.map((p) => {
                    const cfg = kindConfig(p.kind);
                    return (
                      <li key={p.id} className="space-y-3 px-5 py-4">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <Link to={`${cfg.adminBase}/${p.id}`} className="font-semibold text-brand-blue hover:underline">
                              {p.title || 'Untitled'}
                            </Link>
                            <p className="font-mono text-[11px] text-slate-400">{cfg.publicPath(p.slug)}</p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{p.status}</span>
                        </div>
                        <input
                          value={p.seo_title}
                          onChange={(e) =>
                            setPages((list) => list.map((row) => (row.id === p.id ? { ...row, seo_title: e.target.value } : row)))
                          }
                          placeholder={`SEO title (now: ${p.title})`}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-blue/40"
                        />
                        <textarea
                          value={p.seo_description}
                          onChange={(e) =>
                            setPages((list) => list.map((row) => (row.id === p.id ? { ...row, seo_description: e.target.value } : row)))
                          }
                          placeholder="Meta description"
                          rows={2}
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-blue/40"
                        />
                        <button
                          type="button"
                          disabled={rowSaving === p.id}
                          onClick={() => void saveRow(p)}
                          className="text-xs font-black uppercase tracking-widest text-brand-blue hover:underline disabled:opacity-50"
                        >
                          {rowSaving === p.id ? 'Saving…' : 'Save SEO'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AdminCmsShell>
  );
}
