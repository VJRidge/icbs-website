import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageNewsletter } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type Issue = {
  id: string;
  subject: string;
  preview_text: string;
  body_html: string;
  body_text: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
};

type JobStats = { pending: number; sent: number; failed: number; skipped: number };

export default function NewsletterEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { issueId } = useParams<{ issueId: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [stats, setStats] = useState<JobStats>({ pending: 0, sent: 0, failed: 0, skipped: 0 });
  const [scheduleLocal, setScheduleLocal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed = canManageNewsletter(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!issueId) return;
    const { data, error: issueError } = await supabase
      .from('newsletter_issues')
      .select('id, subject, preview_text, body_html, body_text, status, scheduled_for, sent_at, recipient_count')
      .eq('id', issueId)
      .maybeSingle();
    if (issueError || !data) {
      setError(issueError?.message || 'Issue not found.');
      setIssue(null);
      return;
    }
    setIssue(data as Issue);
    if (data.scheduled_for) {
      const d = new Date(data.scheduled_for);
      const pad = (n: number) => String(n).padStart(2, '0');
      setScheduleLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    } else {
      setScheduleLocal('');
    }

    const { count } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('marketing_ok', true)
      .is('suppressed_at', null);
    setEligibleCount(typeof count === 'number' ? count : null);

    const { data: jobs } = await supabase
      .from('newsletter_send_jobs')
      .select('status')
      .eq('issue_id', issueId)
      .limit(5000);
    const next: JobStats = { pending: 0, sent: 0, failed: 0, skipped: 0 };
    for (const j of jobs || []) {
      if (j.status === 'sent') next.sent += 1;
      else if (j.status === 'failed') next.failed += 1;
      else if (j.status === 'skipped') next.skipped += 1;
      else if (j.status === 'pending' || j.status === 'processing') next.pending += 1;
    }
    setStats(next);
    setError(null);
  }, [issueId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function saveDraft() {
    if (!issue || !allowed || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          subject: issue.subject.trim(),
          preview_text: issue.preview_text,
          body_html: issue.body_html,
          body_text: issue.body_text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id);
      if (saveError) throw saveError;
      setNotice('Draft saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function scheduleIssue() {
    if (!issue || !allowed || saving) return;
    if (!issue.subject.trim()) {
      setError('Subject is required before scheduling.');
      return;
    }
    if (!scheduleLocal) {
      setError('Pick a schedule time.');
      return;
    }
    const when = new Date(scheduleLocal);
    if (Number.isNaN(when.getTime())) {
      setError('Invalid schedule time.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          subject: issue.subject.trim(),
          preview_text: issue.preview_text,
          body_html: issue.body_html,
          body_text: issue.body_text,
          status: 'scheduled',
          scheduled_for: when.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
        .in('status', ['draft', 'scheduled']);
      if (saveError) throw saveError;
      setNotice(`Scheduled for ${when.toLocaleString()}. Eligible contacts now: ${eligibleCount ?? '—'}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Schedule failed.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelSchedule() {
    if (!issue || !allowed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase
        .from('newsletter_issues')
        .update({
          status: 'draft',
          scheduled_for: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
        .eq('status', 'scheduled');
      if (saveError) throw saveError;
      setNotice('Schedule cancelled. Issue is a draft again.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Newsletter" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage newsletter issues.</p>
      </AdminCmsShell>
    );
  }

  const locked = issue?.status === 'sending' || issue?.status === 'sent';

  return (
    <AdminCmsShell
      title="Newsletter"
      titleIcon={<Mail size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <Link
          to="/admin/newsletter"
          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-blue"
        >
          ← Newsletter
        </Link>
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-800">{notice}</p> : null}
        {issue ? (
          <>
            <h1 className="mt-4 font-serif text-3xl font-black text-slate-900">Issue</h1>
            <p className="mt-1 text-sm text-slate-600">
              Status: <strong>{issue.status}</strong>
              {eligibleCount != null ? ` · ${eligibleCount} eligible contacts` : ''}
            </p>

            <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Subject
              <input
                disabled={locked}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 disabled:bg-slate-50"
                value={issue.subject}
                onChange={(e) => setIssue({ ...issue, subject: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Preview text
              <input
                disabled={locked}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 disabled:bg-slate-50"
                value={issue.preview_text}
                onChange={(e) => setIssue({ ...issue, preview_text: e.target.value })}
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Body (plain text)
              <textarea
                disabled={locked}
                rows={8}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 disabled:bg-slate-50"
                value={issue.body_text}
                onChange={(e) =>
                  setIssue({
                    ...issue,
                    body_text: e.target.value,
                    body_html: `<p>${e.target.value
                      .split(/\n\n+/)
                      .map((p) =>
                        p
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/\n/g, '<br>'),
                      )
                      .join('</p><p>')}</p>`,
                  })
                }
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Schedule (local)
              <input
                type="datetime-local"
                disabled={locked}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 disabled:bg-slate-50"
                value={scheduleLocal}
                onChange={(e) => setScheduleLocal(e.target.value)}
              />
            </label>

            <div className="mt-6 flex flex-wrap gap-2">
              {!locked ? (
                <button
                  type="button"
                  className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void saveDraft()}
                >
                  Save draft
                </button>
              ) : null}
              {issue.status === 'draft' || issue.status === 'scheduled' ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void scheduleIssue()}
                >
                  Schedule send
                </button>
              ) : null}
              {issue.status === 'scheduled' ? (
                <button
                  type="button"
                  className="rounded-xl border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 disabled:opacity-50"
                  disabled={saving}
                  onClick={() => void cancelSchedule()}
                >
                  Cancel schedule
                </button>
              ) : null}
            </div>

            <h2 className="mt-10 text-lg font-bold text-slate-900">Delivery</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pending {stats.pending} · Sent {stats.sent} · Failed {stats.failed} · Skipped {stats.skipped}
              {issue.recipient_count ? ` · Frozen snapshot ${issue.recipient_count}` : ''}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Cron <code>/api/newsletter-send</code> freezes eligible contacts at send time and delivers with
              dedupe + retries. Opt-outs use <code>/api/contact-unsubscribe</code>.
            </p>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
