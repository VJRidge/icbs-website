import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Contact } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageContacts } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type ContactDetail = {
  id: string;
  email: string;
  first_name: string | null;
  marketing_ok: boolean;
  suppressed_at: string | null;
  unsubscribe_token: string;
  first_consented_at: string | null;
  last_consented_at: string | null;
  source_form_id: string | null;
  created_at: string;
  updated_at: string;
};

type ConsentEvent = {
  id: string;
  event_type: string;
  consent_text: string;
  form_id: string | null;
  form_version: number | null;
  submission_id: string | null;
  occurred_at: string;
};

export default function ContactDetailPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { contactId } = useParams<{ contactId: string }>();
  const [row, setRow] = useState<ContactDetail | null>(null);
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canManageContacts(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!contactId) return;
    const { data, error: contactError } = await supabase
      .from('contacts')
      .select(
        'id, email, first_name, marketing_ok, suppressed_at, unsubscribe_token, first_consented_at, last_consented_at, source_form_id, created_at, updated_at',
      )
      .eq('id', contactId)
      .maybeSingle();
    if (contactError) {
      setError(contactError.message);
      setRow(null);
      return;
    }
    if (!data) {
      setError('Contact not found.');
      setRow(null);
      return;
    }
    setRow(data as ContactDetail);
    const { data: eventRows, error: eventsError } = await supabase
      .from('contact_consent_events')
      .select('id, event_type, consent_text, form_id, form_version, submission_id, occurred_at')
      .eq('contact_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(100);
    if (eventsError) {
      setError(eventsError.message);
      setEvents([]);
      return;
    }
    setError(null);
    setEvents((eventRows as ConsentEvent[]) ?? []);
  }, [contactId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contact" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contacts.</p>
      </AdminCmsShell>
    );
  }

  const unsubPath = row ? `/api/contact-unsubscribe?token=${row.unsubscribe_token}` : '';

  return (
    <AdminCmsShell
      title="Contact"
      titleIcon={<Contact size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/contacts"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Contacts
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {row ? (
          <>
            <h1 className="mt-4 font-serif text-3xl font-black text-slate-900">{row.email}</h1>
            <p className="mt-1 text-sm text-slate-600">{row.first_name || 'No name on file'}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {row.marketing_ok ? 'Marketing OK' : 'Suppressed'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">First consent</dt>
                <dd className="mt-1 text-slate-800">
                  {row.first_consented_at ? new Date(row.first_consented_at).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Last consent</dt>
                <dd className="mt-1 text-slate-800">
                  {row.last_consented_at ? new Date(row.last_consented_at).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">Suppressed at</dt>
                <dd className="mt-1 text-slate-800">
                  {row.suppressed_at ? new Date(row.suppressed_at).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 break-all text-xs text-slate-500">
              Preference link (for future emails): <code>{unsubPath}</code>
            </p>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Consent history</h2>
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {events.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-500">No events recorded.</li>
              ) : (
                events.map((ev) => (
                  <li key={ev.id} className="px-4 py-3 text-sm">
                    <div className="font-semibold text-slate-900">
                      {ev.event_type} · {new Date(ev.occurred_at).toLocaleString()}
                    </div>
                    <div className="mt-1 text-slate-600">{ev.consent_text}</div>
                    {ev.form_version != null ? (
                      <div className="mt-1 text-xs text-slate-400">Form version {ev.form_version}</div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
