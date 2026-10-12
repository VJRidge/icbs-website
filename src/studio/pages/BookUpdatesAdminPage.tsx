import { useCallback, useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { supabase } from '../lib/supabase';
import type { BookUpdateEntry } from '../../pages/resources/bookUpdates';
import {
  BOOK_UPDATES_KEY,
  emptyBookUpdatesDocument,
  parseBookUpdates,
  validateBookUpdateEntry,
} from '../../lib/site/siteManagedContent';
import type { UserProfile } from '../types';

const EMPTY_DRAFT: Omit<BookUpdateEntry, 'id'> = {
  type: 'Correction',
  publishedAt: new Date().toISOString().slice(0, 10),
  title: '',
  summary: '',
  readerAction: '',
};

export default function BookUpdatesAdminPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [entries, setEntries] = useState<BookUpdateEntry[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('site_managed_content')
      .select('document')
      .eq('key', BOOK_UPDATES_KEY)
      .maybeSingle();
    if (loadError) {
      setError(
        loadError.message.includes('site_managed_content')
          ? 'Apply migration 20261035_site_managed_content.sql, then reload.'
          : loadError.message,
      );
      setEntries([]);
    } else {
      setEntries(parseBookUpdates(data?.document ?? emptyBookUpdatesDocument()).entries);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile, load]);

  const persist = async (next: BookUpdateEntry[]) => {
    if (!userProfile?.id) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { error: upsertError } = await supabase.from('site_managed_content').upsert({
      key: BOOK_UPDATES_KEY,
      kind: 'book_updates',
      document: { entries: next },
      updated_at: new Date().toISOString(),
      updated_by: userProfile.id,
    });
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setEntries(next);
    setNotice('Published to /book/updates.');
  };

  const addEntry = () => {
    const check = validateBookUpdateEntry(draft);
    if (check) {
      setError(check);
      return;
    }
    const entry: BookUpdateEntry = {
      id: crypto.randomUUID(),
      type: draft.type,
      publishedAt: draft.publishedAt.trim(),
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      readerAction: draft.readerAction?.trim() || undefined,
    };
    void persist([entry, ...entries]);
    setDraft({ ...EMPTY_DRAFT, publishedAt: new Date().toISOString().slice(0, 10) });
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <AdminCmsShell title="Book updates" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to edit book updates.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Book updates"
      titleIcon={<BookOpen size={14} className="text-brand-yellow" />}
      backTo="/admin/public-site"
      backLabel="Public site"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900">Book updates &amp; corrections</h1>
          <p className="mt-2 text-sm text-slate-600">
            Only publish real corrections, link updates, or tool changes with chapter/page context. Do not invent
            entries for engagement. Public page:{' '}
            <a href="/book/updates" className="font-semibold text-brand-blue" target="_blank" rel="noreferrer">
              /book/updates
            </a>
          </p>
        </div>

        {error ? <p className="text-sm text-amber-800">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-slate-900">Add entry</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Type
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal"
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as BookUpdateEntry['type'] })
                }
              >
                <option value="Correction">Correction</option>
                <option value="Link update">Link update</option>
                <option value="Tool change">Tool change</option>
              </select>
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Published date
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal"
                value={draft.publishedAt}
                onChange={(e) => setDraft({ ...draft, publishedAt: e.target.value })}
              />
            </label>
          </div>
          <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Cursor docs URL in Chapter 4"
            />
          </label>
          <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
            Summary
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal"
              rows={4}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              placeholder="What changed, edition/chapter/page, and why it matters."
            />
          </label>
          <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
            Reader action (optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal"
              value={draft.readerAction || ''}
              onChange={(e) => setDraft({ ...draft, readerAction: e.target.value })}
              placeholder="What the reader should do next"
            />
          </label>
          <button
            type="button"
            className="mt-4 rounded-lg bg-brand-blue px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
            disabled={saving}
            onClick={addEntry}
          >
            {saving ? 'Saving…' : 'Publish entry'}
          </button>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-900">Published entries ({entries.length})</h2>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">None yet — the public page shows the empty state.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {entry.type} · {entry.publishedAt}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{entry.summary}</p>
                  <button
                    type="button"
                    className="mt-3 text-xs font-bold text-red-700"
                    disabled={saving}
                    onClick={() => void persist(entries.filter((e) => e.id !== entry.id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminCmsShell>
  );
}
