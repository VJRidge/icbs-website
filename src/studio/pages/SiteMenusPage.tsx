import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Menu, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { kindConfig } from '../lib/contentKinds';
import { DEFAULT_SITE_CHROME, invalidateSiteChrome, loadSiteChrome, type SiteMenuItem } from '../../lib/siteChrome';
import type { UserProfile } from '../types';

const PRESETS: SiteMenuItem[] = [
  { id: 'home', label: 'The book', href: '/' },
  { id: 'kit', label: 'Free Starter Kit', href: '/free' },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'about', label: 'About', href: '/about' },
  { id: 'privacy', label: 'Privacy', href: '/privacy' },
  { id: 'terms', label: 'Terms', href: '/terms' },
  { id: 'refunds', label: 'Refunds', href: '/refunds' },
];

type PageOpt = { kind: 'page' | 'post'; slug: string; title: string };
type Location = 'header' | 'footer';
type AddChoice = { label: string; href: string };

function parseChoice(raw: string): AddChoice | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as AddChoice;
    if (!o.label || !o.href) return null;
    return o;
  } catch {
    return null;
  }
}

function MenuItemRow({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: SiteMenuItem;
  index: number;
  total: number;
  onChange: (next: SiteMenuItem) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900">{item.label || 'Untitled'}</span>
          <span className="block truncate font-mono text-[11px] text-slate-400">{item.href || '/'}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Navigation label
            <input
              value={item.label}
              onChange={(e) => onChange({ ...item, label: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-blue/40"
            />
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            URL
            <input
              value={item.href}
              onChange={(e) => onChange({ ...item, href: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-blue/40"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              className="text-xs font-bold text-slate-600 hover:text-brand-blue disabled:opacity-30"
            >
              Move up
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              className="text-xs font-bold text-slate-600 hover:text-brand-blue disabled:opacity-30"
            >
              Move down
            </button>
            <button type="button" onClick={onRemove} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline">
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

async function upsertMenu(location: Location, title: string, items: SiteMenuItem[]) {
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
  const [location, setLocation] = useState<Location>('header');
  const [pick, setPick] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customHref, setCustomHref] = useState('');
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
      setPages(((published.data ?? []) as PageOpt[]).filter((p) => p.slug && p.title));
      setLoading(false);
    })();
  }, [userProfile]);

  const items = location === 'header' ? header : footer;
  const setItems = location === 'header' ? setHeader : setFooter;

  const pageChoices = useMemo(() => pages.filter((p) => p.kind === 'page'), [pages]);
  const postChoices = useMemo(() => pages.filter((p) => p.kind === 'post'), [pages]);

  const addItem = (choice: AddChoice) => {
    if (items.some((x) => x.href === choice.href && x.label === choice.label)) return;
    setItems([...items, { id: nanoid(8), label: choice.label, href: choice.href }]);
  };

  const addPicked = () => {
    const choice = parseChoice(pick);
    if (!choice) return;
    addItem(choice);
    setPick('');
  };

  const addCustom = () => {
    const label = customLabel.trim();
    const href = customHref.trim();
    if (!label || !href) {
      window.alert('Enter a label and a URL.');
      return;
    }
    addItem({ label, href: href.startsWith('/') || href.startsWith('http') ? href : `/${href}` });
    setCustomLabel('');
    setCustomHref('');
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await upsertMenu('header', 'Header', header);
      await upsertMenu('footer', 'Footer', footer);
      invalidateSiteChrome();
      setStatus('Saved. Header shows on /about and /blog. Footer shows site-wide, including /free.');
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
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900">Navigation</h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-slate-600">
            Choose a menu, add pages from the dropdown, then expand a row to rename or reorder it.
          </p>
          <label className="mt-4 block max-w-xs text-[10px] font-black uppercase tracking-widest text-slate-400">
            Select a menu
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as Location)}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
            >
              <option value="header">Header ({header.length})</option>
              <option value="footer">Footer ({footer.length})</option>
            </select>
          </label>
        </div>
        {status ? (
          <p className={`mt-4 text-sm font-medium ${status.startsWith('Saved') ? 'text-emerald-700' : 'text-red-700'}`}>{status}</p>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-serif text-lg font-black text-slate-900">Add pages</h2>
                <p className="mt-1 text-xs text-slate-500">Pick a published page, post, or built-in link.</p>
                <select
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Select…</option>
                  <optgroup label="Site">
                    {PRESETS.map((q) => (
                      <option key={q.href} value={JSON.stringify({ label: q.label, href: q.href })}>
                        {q.label}
                      </option>
                    ))}
                  </optgroup>
                  {pageChoices.length ? (
                    <optgroup label="Pages">
                      {pageChoices.map((p) => (
                        <option
                          key={`page-${p.slug}`}
                          value={JSON.stringify({ label: p.title, href: kindConfig('page').publicPath(p.slug) })}
                        >
                          {p.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {postChoices.length ? (
                    <optgroup label="Posts">
                      {postChoices.map((p) => (
                        <option
                          key={`post-${p.slug}`}
                          value={JSON.stringify({ label: p.title, href: kindConfig('post').publicPath(p.slug) })}
                        >
                          {p.title}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                <button
                  type="button"
                  disabled={!pick}
                  onClick={addPicked}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-brand-blue disabled:opacity-40"
                >
                  <Plus size={14} /> Add to menu
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-serif text-lg font-black text-slate-900">Custom link</h2>
                <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  URL
                  <input
                    value={customHref}
                    onChange={(e) => setCustomHref(e.target.value)}
                    placeholder="/privacy"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-brand-blue/40"
                  />
                </label>
                <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Link text
                  <input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Privacy"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-blue/40"
                  />
                </label>
                <button
                  type="button"
                  onClick={addCustom}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-brand-blue"
                >
                  <Plus size={14} /> Add to menu
                </button>
              </section>
            </aside>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-serif text-xl font-black text-slate-900">{location === 'header' ? 'Header' : 'Footer'} menu</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {location === 'header'
                    ? 'Green bar on /about, /blog, and legal pages. Not inside the /free kit hero.'
                    : 'Shown on every public page, including /free.'}
                </p>
              </div>
              {items.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No links yet. Add one from the left.</p>
              ) : (
                <ul>
                  {items.map((item, i) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      index={i}
                      total={items.length}
                      onChange={(next) => {
                        const copy = [...items];
                        copy[i] = next;
                        setItems(copy);
                      }}
                      onMove={(dir) => {
                        const j = i + dir;
                        if (j < 0 || j >= items.length) return;
                        const copy = [...items];
                        const [row] = copy.splice(i, 1);
                        copy.splice(j, 0, row);
                        setItems(copy);
                      }}
                      onRemove={() => setItems(items.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save menu'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminCmsShell>
  );
}
