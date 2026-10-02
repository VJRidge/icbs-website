import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { CONTENT_KINDS } from '../lib/contentKinds';
import type { UserProfile } from '../types';

type RedirectRow = { id: string; from_path: string; to_path: string; status_code: number };
type SeoRow = { id: string; kind: 'page' | 'post'; title: string; slug: string; seo_title: string | null; seo_description: string | null; status: string };

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

  const load = async () => {
    const [{ data: settings }, { data: reds }, { data: contents }] = await Promise.all([
      supabase.from('settings').select('site_description, global_styles').eq('id', 1).maybeSingle(),
      supabase.from('redirects').select('id, from_path, to_path, status_code').order('from_path'),
      supabase
        .from('contents')
        .select('id, kind, title, slug, seo_title, seo_description, status')
        .neq('status', 'trash')
        .order('title'),
    ]);
    const styles = (settings?.global_styles ?? {}) as Record<string, unknown>;
    setPrevStyles(styles);
    setSuffix(typeof styles.seoTitleSuffix === 'string' && styles.seoTitleSuffix ? styles.seoTitleSuffix : 'I Call BS');
    setDescription(settings?.site_description ?? '');
    setRedirects((reds as RedirectRow[]) ?? []);
    setPages((contents as SeoRow[]) ?? []);
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
    const { error } = await supabase
      .from('settings')
      .update({
        site_description: description.trim() || null,
        global_styles: { ...prevStyles, seoTitleSuffix: suffix.trim() || 'I Call BS' },
      })
      .eq('id', 1);
    setSaving(false);
    if (error) window.alert(error.message);
    else setPrevStyles({ ...prevStyles, seoTitleSuffix: suffix.trim() || 'I Call BS' });
  };

  const addRedirect = async () => {
    const from = fromPath.trim().startsWith('/') ? fromPath.trim() : `/${fromPath.trim()}`;
    const to = toPath.trim();
    if (!from || from === '/' || !to) {
      window.alert('Enter a from path (not /) and a destination.');
      return;
    }
    const { error } = await supabase.from('redirects').insert({ from_path: from, to_path: to, status_code: 301 });
    if (error) {
      window.alert(error.code === '23505' ? 'That from-path already has a redirect.' : error.message);
      return;
    }
    setFromPath('');
    setToPath('');
    await load();
  };

  const removeRedirect = async (id: string) => {
    const { error } = await supabase.from('redirects').delete().eq('id', id);
    if (error) window.alert(error.message);
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
            Defaults for the browser tab title, plus 301s when a slug moves. Per-page titles still live on each editor.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-black">Defaults</h2>
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
              <h2 className="font-serif text-xl font-black">Redirects</h2>
              <div className="flex flex-wrap gap-2">
                <input
                  value={fromPath}
                  onChange={(e) => setFromPath(e.target.value)}
                  placeholder="/old-slug"
                  className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-blue/40"
                />
                <input
                  value={toPath}
                  onChange={(e) => setToPath(e.target.value)}
                  placeholder="/about or https://…"
                  className="min-w-[10rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-blue/40"
                />
                <button
                  type="button"
                  onClick={() => void addRedirect()}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              {redirects.length === 0 ? (
                <p className="text-sm text-slate-500">None yet. Changing a published slug also creates one automatically.</p>
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
                <h2 className="font-serif text-xl font-black">Per-page SEO</h2>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Title</th>
                    <th className="hidden px-4 py-2 sm:table-cell">SEO title</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => (
                    <tr key={p.id} className="border-t border-slate-50">
                      <td className="px-4 py-2">
                        <Link to={`${CONTENT_KINDS[p.kind].adminBase}/${p.id}`} className="font-semibold text-brand-blue hover:underline">
                          {p.title || 'Untitled'}
                        </Link>
                        <p className="font-mono text-[11px] text-slate-400">{CONTENT_KINDS[p.kind].publicPath(p.slug)}</p>
                      </td>
                      <td className="hidden px-4 py-2 text-slate-600 sm:table-cell">{p.seo_title || '—'}</td>
                      <td className="px-4 py-2 text-[10px] font-black uppercase text-slate-500">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </AdminCmsShell>
  );
}
