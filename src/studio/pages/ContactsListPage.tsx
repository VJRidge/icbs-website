import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Contact } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageContacts } from '../lib/cms/authorization';
import {
  contactsToCsv,
  downloadTextFile,
  parseContactsCsv,
} from '../../lib/contacts/contactCsv';
import type { UserProfile } from '../types';

type ContactListRow = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  first_consented_at: string | null;
  last_consented_at: string | null;
  updated_at: string;
};

type Panel = 'none' | 'add' | 'import' | 'send';

const STAFF_CONSENT = 'Added by studio staff with marketing consent recorded.';

export default function ContactsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<ContactListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState<Panel>('none');
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addMarketing, setAddMarketing] = useState(true);
  const [importMarketing, setImportMarketing] = useState(true);
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [query, setQuery] = useState('');

  const allowed = canManageContacts(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('contacts')
      .select(
        'id, email, first_name, marketing_ok, suppressed_at, first_consented_at, last_consented_at, updated_at',
      )
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as ContactListRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.first_name || '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of visible) next.delete(r.id);
      } else {
        for (const r of visible) next.add(r.id);
      }
      return next;
    });
  }

  async function addContact() {
    if (busy) return;
    const email = addEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const now = new Date().toISOString();
      const { data, error: insertError } = await supabase
        .from('contacts')
        .upsert(
          {
            email,
            first_name: addName.trim().slice(0, 80) || null,
            marketing_ok: addMarketing,
            suppressed_at: addMarketing ? null : now,
            first_consented_at: addMarketing ? now : null,
            last_consented_at: addMarketing ? now : null,
            updated_at: now,
          },
          { onConflict: 'email' },
        )
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id && addMarketing) {
        await supabase.from('contact_consent_events').insert({
          contact_id: data.id,
          event_type: 'granted',
          consent_text: STAFF_CONSENT,
          occurred_at: now,
        });
      }
      setNotice(`Contact ${email} saved.`);
      setAddEmail('');
      setAddName('');
      setPanel('none');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add contact.');
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const text = await file.text();
      const { rows: parsed, error: parseError } = parseContactsCsv(text);
      if (parseError && !parsed.length) throw new Error(parseError);
      const now = new Date().toISOString();
      let created = 0;
      const chunk = 40;
      for (let i = 0; i < parsed.length; i += chunk) {
        const slice = parsed.slice(i, i + chunk);
        const payload = slice.map((r) => ({
          email: r.email,
          first_name: r.firstName,
          marketing_ok: importMarketing,
          suppressed_at: importMarketing ? null : now,
          first_consented_at: importMarketing ? now : null,
          last_consented_at: importMarketing ? now : null,
          updated_at: now,
        }));
        const { data, error: upsertError } = await supabase
          .from('contacts')
          .upsert(payload, { onConflict: 'email' })
          .select('id, email');
        if (upsertError) throw upsertError;
        created += data?.length ?? 0;
        if (importMarketing && data?.length) {
          await supabase.from('contact_consent_events').insert(
            data.map((c) => ({
              contact_id: c.id,
              event_type: 'granted',
              consent_text: 'Imported by studio staff with marketing consent recorded.',
              occurred_at: now,
            })),
          );
        }
      }
      setNotice(
        `Imported ${created} contact(s)${parseError ? ` (${parseError})` : ''}.`,
      );
      setPanel('none');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const source =
      selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : visible;
    if (!source.length) {
      setError('Nothing to export.');
      return;
    }
    downloadTextFile(
      `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      contactsToCsv(source),
    );
    setNotice(`Exported ${source.length} contact(s).`);
  }

  async function deleteSelected() {
    if (busy || selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} contact(s)? Consent history for those contacts is removed too.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const ids = [...selected];
      const { error: delError } = await supabase.from('contacts').delete().in('id', ids);
      if (delError) throw delError;
      setSelected(new Set());
      setNotice(`Deleted ${ids.length} contact(s).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (busy || selected.size === 0) return;
    if (!sendSubject.trim() || !sendBody.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in again to send email.');
      const res = await fetch('/api/contact-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contactIds: [...selected].slice(0, 50),
          subject: sendSubject.trim(),
          text: sendBody.trim(),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        skipped?: number;
      };
      if (!res.ok) throw new Error(payload.error || 'Send failed.');
      setNotice(`Sent ${payload.sent ?? 0}. Skipped ${payload.skipped ?? 0} (suppressed or marketing off).`);
      setPanel('none');
      setSendSubject('');
      setSendBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contacts" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contacts.</p>
      </AdminCmsShell>
    );
  }

  const btn =
    'rounded-md border border-slate-300 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-50';
  const btnPrimary =
    'rounded-md bg-brand-blue px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50';

  return (
    <AdminCmsShell
      title="Contacts"
      titleIcon={<Contact size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Contacts</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Marketing identities from lead-capture forms. Separate from the kit subscribers list. Consent
              events are append-only.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => setPanel(panel === 'add' ? 'none' : 'add')}>
              Add
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}>
              Import
            </button>
            <button type="button" className={btn} disabled={busy || visible.length === 0} onClick={() => exportCsv()}>
              Export
            </button>
            <button
              type="button"
              className={btn}
              disabled={busy || selected.size === 0}
              onClick={() => setPanel(panel === 'send' ? 'none' : 'send')}
            >
              Send email
            </button>
            <button type="button" className={btn} disabled={busy || selected.size === 0} onClick={() => void deleteSelected()}>
              Delete
            </button>
            <Link to="/admin/imports" className={btn}>
              Kit import
            </Link>
          </div>
        </div>

        {panel === 'add' ? (
          <section className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Add contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                Email
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                First name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={addMarketing} onChange={(e) => setAddMarketing(e.target.checked)} />
              Marketing consent recorded (can receive email)
            </label>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void addContact()}>
              Save contact
            </button>
          </section>
        ) : null}

        {panel === 'import' ? (
          <section className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Import CSV</h2>
            <p className="text-xs text-slate-500">
              Columns: <code>email</code>, optional <code>first_name</code>. Max 2000 rows.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={importMarketing}
                onChange={(e) => setImportMarketing(e.target.checked)}
              />
              Mark imported contacts as marketing OK (records consent)
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCsv(file);
                e.target.value = '';
              }}
            />
          </section>
        ) : null}

        {panel === 'send' ? (
          <section className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              Send email ({Math.min(selected.size, 50)} selected, max 50)
            </h2>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              Subject
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
              Message
              <textarea
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm normal-case tracking-normal text-slate-900"
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
              />
            </label>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void sendEmail()}>
              Send now
            </button>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder="Search email or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="text-xs text-slate-500">
            {selected.size} selected · {visible.length} shown
          </p>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {!loading && visible.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No contacts yet. Use Add or Import, or wait for published lead-capture form submissions.
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {visible.length > 0 ? (
            <li className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2">
              <input type="checkbox" checked={allVisibleSelected} onChange={() => toggleAllVisible()} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select all shown</span>
            </li>
          ) : null}
          {visible.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleOne(row.id)} />
              <Link to={`/admin/contacts/${row.id}`} className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">
                  {row.first_name ? `${row.first_name} · ` : ''}
                  {row.email}
                </div>
                <div className="text-xs text-slate-500">
                  {row.suppressed_at ? 'Suppressed' : row.marketing_ok ? 'Marketing OK' : 'No marketing'}
                  {row.last_consented_at
                    ? ` · last consent ${new Date(row.last_consented_at).toLocaleString()}`
                    : ''}
                </div>
              </Link>
              <Link
                to={`/admin/contacts/${row.id}`}
                className="text-[10px] font-black uppercase tracking-widest text-brand-blue"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
