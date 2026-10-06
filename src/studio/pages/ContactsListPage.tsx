import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Contact } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageContacts } from '../lib/cms/authorization';
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

export default function ContactsListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<ContactListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .limit(200);
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

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Contacts" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage contacts.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Contacts"
      titleIcon={<Contact size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div>
          <h1 className="font-serif text-3xl font-black text-slate-900">Contacts</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Marketing identities from lead-capture forms. Separate from the kit subscribers list. Consent events are
            append-only.
          </p>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No contacts yet. Submissions to published lead-capture forms appear here.</p>
        ) : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/contacts/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {row.first_name ? `${row.first_name} · ` : ''}
                    {row.email}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.marketing_ok ? 'Marketing OK' : 'Suppressed'}
                    {row.last_consented_at
                      ? ` · last consent ${new Date(row.last_consented_at).toLocaleString()}`
                      : ''}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">View</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AdminCmsShell>
  );
}
