import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type IssueRow = {
  id: string;
  subject: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  updated_at: string;
};

export default function NewsletterListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const { data, error: listError } = await supabase
      .from('newsletter_issues')
      .select('id, subject, status, scheduled_for, sent_at, recipient_count, updated_at')
      .order('updated_at', { ascending: false });
    if (listError) {
      setError(listError.message);
      setRows([]);
      return;
    }
    setError(null);
    setRows((data as IssueRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function createIssue() {
    if (!allowed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('newsletter_issues')
        .insert({
          subject: 'Untitled issue',
          status: 'draft',
          created_by: userProfile?.id ?? null,
        })
        .select('id')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data?.id) window.location.assign(`/admin/newsletter/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create issue.');
    } finally {
      setCreating(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Newsletter" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage newsletter issues.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Newsletter"
      titleIcon={<Mail size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Newsletter</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Issues go to Contacts with marketing consent. Suppression and provider bounce/complaint events are
              honored. Kit subscribers are not used.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            disabled={creating}
            onClick={() => void createIssue()}
          >
            {creating ? 'Creating…' : 'New issue'}
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={`/admin/newsletter/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{row.subject || 'Untitled'}</div>
                  <div className="text-xs text-slate-500">
                    {row.status}
                    {row.scheduled_for ? ` · ${new Date(row.scheduled_for).toLocaleString()}` : ''}
                    {row.recipient_count ? ` · ${row.recipient_count} recipients` : ''}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
        {!loading && rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No issues yet.</p>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
