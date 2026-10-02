import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Menu, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { CONTENT_KINDS } from '../lib/contentKinds';
import { DEFAULT_SITE_CHROME, invalidateSiteChrome, loadSiteChrome, type SiteMenuItem } from '../../lib/siteChrome';
import type { UserProfile } from '../types';

const QUICK: SiteMenuItem[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'kit', label: 'Free Starter Kit', href: '/free' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'privacy', label: 'Privacy', href: '/privacy' },
  { id: 'terms', label: 'Terms', href: '/terms' },
  { id: 'refunds', label: 'Refunds', href: '/refunds' },
];

type PageOpt = { kind: 'page' | 'post'; slug: string; title: string };

function MenuEditor({
  title,
  hint,
  items,
  onChange,
  pages,
}: {
  title: string;
  hint: string;
  items: SiteMenuItem[];
  onChange: (next: SiteMenuItem[]) => void;
  pages: PageOpt[];
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const [row] = next.splice(i, 1);
    next.splice(j, 0, row);
    onChange(next);
  };

  const add = (item: SiteMenuItem) => {
    if (items.some((x) => x.href === item.href && x.label === item.label)) return;
    onChange([...items, { ...item, id: nanoid(8) }]);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-serif text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{hint}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">No links yet.</p> : null}
        {items.map((item, i) => (
          <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, label: e.target.value };
                onChange(next);
              }}
              placeholder="Label"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue/40"
            />
            <input
              value={item.href}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, href: e.target.value };
                onChange(next);
              }}
              placeholder="/blog"
              className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-brand-blue/40"
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Move up">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Move down">
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { id: nanoid(8), label: '', href: '/' }])}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-brand-blue"
      >
        <Plus size={14} /> Custom link
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q.href}
            type="button"
            onClick={() => add(q)}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            + {q.label}
          </button>
        ))}
        {pages.map((p) => (
          <button
            key={`${p.kind}-${p.slug}`}
            type="button"
            onClick={() => add({ id: nanoid(8), label: p.title, href: CONTENT_KINDS[p.kind].publicPath(p.slug) })}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            + {p.title}
          </button>
        ))}
      </div>
    </section>
  );
}

async function upsertMenu(location: 'header' | 'footer', title: string, items: SiteMenuItem[]) {
  const clean = items
    .map((it) => ({ id: it.id || nanoid(8), label: it.label.trim(), href: it.href.trim() }))
    .filter((it) => it.label && it.href);
  const { data: existing } = await supabase.from('menus').select('id').eq('location', location).maybeSingle();
  if (existing?.id) {
    const { error } = await supabase
      .from('menus')
      .update({ title, items: clean, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('menus').insert({ location, title, items: clean });
  if (error) throw error;
}

export default function SiteMenusPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [header, setHeader] = useState<SiteMenuItem[]>(DEFAULT_SITE_CHROME.header);
  const [footer, setFooter] = useState<SiteMenuItem[]>(DEFAULT_SITE_CHROME.footer);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void (async () => {
      const [chrome, published] = await Promise.all([
        loadSiteChrome(supabase),
        supabase.from('contents').select('kind, slug, title').eq('status', 'published').in('kind', ['page', 'post']).order('title'),
      ]);
      setHeader(chrome.header);
      setFooter(chrome.footer);
      setPages(
        ((published.data ?? []) as PageOpt[]).filter((p) => p.slug && p.title),
      );
      setLoading(false);
    })();
  }, [userProfile]);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await upsertMenu('header', 'Header', header);
      await upsertMenu('footer', 'Footer', footer);
      invalidateSiteChrome();
      setStatus('Saved. Header links show on /about and /blog. Footer links show site-wide, including /free.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save menus.';
      setStatus(msg);
      window.alert(msg);
    } finally {
      setSaving(false);
    }
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
      title="Navigation"
      titleIcon={<Menu size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Navigation</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Header links appear on the blog, articles, and legal pages. Footer links appear site-wide, including the kit.
        </p>
        {loading ? (
          <p className="mt-10 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <MenuEditor
              title="Header"
              hint="Shown in the green bar on public pages (not inside the /free kit hero)."
              items={header}
              onChange={setHeader}
              pages={pages}
            />
            <MenuEditor
              title="Footer"
              hint="Shown on every public page, including /free."
              items={footer}
              onChange={setFooter}
              pages={pages}
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save menus'}
            </button>
            {status ? (
              <p className={`text-sm font-medium ${status.startsWith('Saved') ? 'text-emerald-700' : 'text-red-700'}`}>{status}</p>
            ) : null}
          </div>
        )}
      </div>
    </AdminCmsShell>
  );
}
