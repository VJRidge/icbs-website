import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Import } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canManageImports } from '../lib/cms/authorization';
import type { UserProfile } from '../types';

type JobSummary = {
  total?: number;
  create?: number;
  update?: number;
  suppress?: number;
  skip?: number;
  wouldWrite?: number;
  applied?: number;
};

type ImportJob = {
  id: string;
  source: string;
  status: string;
  summary: JobSummary;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
};

type JobRow = {
  id: string;
  source_key: string;
  email: string | null;
  action: string;
  reason: string;
  status: string;
};

async function callImportApi(jobId: string, action: 'dry_run' | 'commit') {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sign in required.');
  const res = await fetch('/api/import-kit-subscribers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jobId, action }),
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string; summary?: JobSummary };
  if (!res.ok) throw new Error(payload.error || `Import ${action} failed.`);
  return payload;
}

export default function ImportJobPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'dry_run' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allowed = canManageImports(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    if (!jobId) return;
    const { data, error: jobError } = await supabase
      .from('import_jobs')
      .select('id, source, status, summary, error_message, created_at, finished_at')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError || !data) {
      setError(jobError?.message || 'Import job not found.');
      setJob(null);
      return;
    }
    setJob({
      ...(data as ImportJob),
      summary: data.summary && typeof data.summary === 'object' ? (data.summary as JobSummary) : {},
    });

    const { data: rowData } = await supabase
      .from('import_job_rows')
      .select('id, source_key, email, action, reason, status')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .limit(100);
    setRows((rowData as JobRow[]) ?? []);
  }, [jobId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  async function run(action: 'dry_run' | 'commit') {
    if (!jobId || busy) return;
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const result = await callImportApi(jobId, action);
      setNotice(
        action === 'dry_run'
          ? `Dry-run complete: ${result.summary?.wouldWrite ?? 0} would write of ${result.summary?.total ?? 0}.`
          : `Committed ${result.summary?.wouldWrite ?? 0} contact changes.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import action failed.');
    } finally {
      setBusy(null);
    }
  }

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Imports" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to manage imports.</p>
      </AdminCmsShell>
    );
  }

  const summary = job?.summary ?? {};
  const canDryRun = job && job.status !== 'committed' && job.status !== 'committing';
  const canCommit = job && job.status === 'dry_run';

  return (
    <AdminCmsShell
      title="Import job"
      titleIcon={<Import size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <p className="mb-4 text-sm">
          <Link to="/admin/imports" className="text-brand-blue underline-offset-2 hover:underline">
            ← All imports
          </Link>
        </p>
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mb-4 text-sm text-emerald-800">{notice}</p> : null}
        {job ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-black text-slate-900">Kit → Contacts</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Source <span className="font-mono">{job.source}</span> · status{' '}
                  <span className="font-semibold">{job.status}</span>
                </p>
                {job.error_message ? (
                  <p className="mt-2 text-sm text-red-700">{job.error_message}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-800 disabled:opacity-50"
                  disabled={!canDryRun || busy !== null}
                  onClick={() => void run('dry_run')}
                >
                  {busy === 'dry_run' ? 'Running…' : 'Dry-run'}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                  disabled={!canCommit || busy !== null}
                  onClick={() => void run('commit')}
                >
                  {busy === 'commit' ? 'Committing…' : 'Commit'}
                </button>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {(
                [
                  ['total', summary.total],
                  ['create', summary.create],
                  ['update', summary.update],
                  ['suppress', summary.suppress],
                  ['skip', summary.skip],
                  ['would write', summary.wouldWrite],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</dt>
                  <dd className="mt-1 font-serif text-2xl font-black text-slate-900">
                    {typeof value === 'number' ? value : '—'}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-xs text-slate-500">
              Dry-run writes planned rows only. Commit upserts Contacts + consent events and records idempotency
              keys. Kit `subscribers` are never mutated.
            </p>

            <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {rows.map((row) => (
                <li key={row.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{row.email || '(invalid email)'}</span>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      {row.action} · {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{row.reason}</p>
                </li>
              ))}
              {rows.length === 0 ? (
                <li className="px-4 py-8 text-sm text-slate-500">
                  No planned rows yet. Run a dry-run to map kit subscribers.
                </li>
              ) : null}
            </ul>
            {typeof summary.total === 'number' && summary.total > rows.length ? (
              <p className="mt-2 text-xs text-slate-500">Showing first {rows.length} of {summary.total} rows.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
