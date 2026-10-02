import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import type { UserProfile } from '../types';

type Template = { id: string; title: string; kind: string; is_global: boolean; created_at: string };
type PageOpt = { id: string; title: string; slug: string; kind: 'page' | 'post'; layout: string | null };

export default function SiteTemplatesPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<Template[]>([]);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [title, setTitle] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('templates').select('id, title, kind, is_global, created_at').order('created_at', { ascending: false }),
      supabase.from('contents').select('id, title, slug, kind, layout').neq('status', 'trash').order('title'),
    ]);
    setRows((t as Template[]) ?? []);
    setPages((p as PageOpt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile]);

  const create = async () => {
    const name = title.trim();
    if (!name) {
      window.alert('Name the template.');
      return;
    }
    setSaving(true);
    let document: Record<string, unknown> = { format: 'blocks', blocks: [], layout: 'article' };
    let kind = 'page';
    if (sourceId) {
      const { data } = await supabase.from('contents').select('kind, layout, content_blocks').eq('id', sourceId).maybeSingle();
      if (data) {
        kind = data.kind === 'post' ? 'post' : 'page';
        document = {
          format: 'blocks',
          blocks: data.content_blocks ?? [],
          layout: data.layout === 'landing' ? 'landing' : 'article',
        };
      }
    }
    const { error } = await supabase.from('templates').insert({ title: name, kind, is_global: false, document });
    setSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setTitle('');
    setSourceId('');
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) window.alert(error.message);
    else setRows((list) => list.filter((r) => r.id !== id));
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
      title="Templates"
      titleIcon={<LayoutTemplate size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Templates</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Snapshot a page or post, then start a new one from that layout. Header and footer chrome is under Header & footer.
        </p>

        <section className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-black">New template</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue/40"
          />
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Empty (just a name)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                Copy: {p.title} ({p.kind})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => void create()}
            className="inline-flex items-center gap-1 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
          >
            <Plus size={14} /> Save template
          </button>
        </section>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No templates yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">{r.title}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{r.kind}</p>
                  </div>
                  <Link
                    to={r.kind === 'post' ? `/admin/posts/new?template=${r.id}` : `/admin/pages/new?template=${r.id}`}
                    className="text-xs font-black uppercase tracking-widest text-brand-blue hover:underline"
                  >
                    Use
                  </Link>
                  <button type="button" onClick={() => void remove(r.id)} className="p-1 text-red-500" aria-label="Delete template">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminCmsShell>
  );
}
