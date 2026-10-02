import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { kindConfig } from '../lib/contentKinds';
import type { UserProfile } from '../types';

type Template = { id: string; title: string; kind: string; document: { blocks?: unknown[]; layout?: string } | null };
type PageOpt = { id: string; title: string; slug: string; kind: 'page' | 'post'; layout: string | null; status: string };

function blockCount(doc: Template['document']): number {
  return Array.isArray(doc?.blocks) ? doc.blocks.length : 0;
}

export default function SiteTemplatesPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<Template[]>([]);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [title, setTitle] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [{ data: t, error: tErr }, { data: p, error: pErr }] = await Promise.all([
      supabase.from('templates').select('id, title, kind, document').order('created_at', { ascending: false }),
      supabase.from('contents').select('id, title, slug, kind, layout, status').neq('status', 'trash').order('title'),
    ]);
    if (tErr || pErr) {
      setError((tErr || pErr)?.message ?? 'Could not load templates.');
      setRows([]);
      setPages([]);
    } else {
      setError(null);
      setRows((t as Template[]) ?? []);
      setPages((p as PageOpt[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile]);

  const saveFrom = async (name: string, source: PageOpt | undefined) => {
    const trimmed = name.trim();
    if (!trimmed) {
      window.alert('Name the template.');
      return;
    }
    setSaving(true);
    let document: Record<string, unknown> = { format: 'blocks', blocks: [], layout: 'article' };
    let kind = source?.kind === 'post' ? 'post' : 'page';
    if (source) {
      const { data } = await supabase.from('contents').select('kind, layout, content_blocks').eq('id', source.id).maybeSingle();
      if (data) {
        kind = data.kind === 'post' ? 'post' : 'page';
        document = {
          format: 'blocks',
          blocks: data.content_blocks ?? [],
          layout: data.layout === 'landing' ? 'landing' : 'article',
        };
      }
    }
    const { error: insertError } = await supabase.from('templates').insert({ title: trimmed, kind, is_global: false, document });
    setSaving(false);
    if (insertError) {
      window.alert(insertError.message);
      return;
    }
    setTitle('');
    setSourceId('');
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    const { error: delError } = await supabase.from('templates').delete().eq('id', id);
    if (delError) window.alert(delError.message);
    else setRows((list) => list.filter((r) => r.id !== id));
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <p className="font-semibold text-slate-700">Administrator access required.</p>
      </div>
    );
  }

  const published = pages.filter((p) => p.status === 'published');

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
          Start a new page or post from a saved layout. Use copies the blocks into a new draft — it does not change the original.
        </p>
        {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-serif text-lg font-black text-slate-900">Save a template</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Template name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-blue/40"
          />
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Empty (just a name)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                Copy: {p.title} ({p.kind}
                {p.status === 'draft' ? ', draft' : ''})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveFrom(title, pages.find((p) => p.id === sourceId))}
            className="inline-flex items-center gap-1 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
          >
            <Plus size={14} /> Save template
          </button>
          {published.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {published.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={saving}
                  onClick={() => void saveFrom(`${p.title} template`, p)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  + Save {p.title}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No templates yet. Save one from a page above.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => {
                const cfg = kindConfig(r.kind);
                const n = blockCount(r.document);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{r.title}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {cfg.singular} · {n} {n === 1 ? 'block' : 'blocks'}
                        {r.document?.layout === 'landing' ? ' · landing' : ' · article'}
                      </p>
                    </div>
                    <Link
                      to={`${cfg.adminBase}/new?template=${r.id}`}
                      className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-yellow"
                    >
                      Use
                    </Link>
                    <button type="button" onClick={() => void remove(r.id)} className="p-1 text-red-500" aria-label="Delete template">
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminCmsShell>
  );
}
