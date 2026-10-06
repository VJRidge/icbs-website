import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, PlugZap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatActivityLabel, listRecentActivity, type ActivityLogRow } from '../../lib/cms/activityLog';
import {
  clientStorageCheck,
  mergeHealthReports,
  type IntegrationCheck,
  type IntegrationHealthReport,
} from '../../lib/cms/integrationHealth';
import { LANDING_MEDIA_BUCKET } from '../../lib/landingPageConfig';

function statusClass(status: string): string {
  if (status === 'ok') return 'text-emerald-700';
  if (status === 'missing') return 'text-amber-700';
  if (status === 'error') return 'text-red-700';
  return 'text-slate-600';
}

/** Real operational panels only — no fabricated charts or placeholder modules. */
export default function DashboardOpsPanels({ userId }: { userId: string }) {
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [health, setHealth] = useState<IntegrationHealthReport | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listRecentActivity(10);
        if (!cancelled) setActivity(rows);
      } catch (err) {
        if (!cancelled) setActivityError(err instanceof Error ? err.message : 'Could not load activity.');
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        let server: IntegrationHealthReport = { checkedAt: new Date().toISOString(), checks: [] };
        if (token) {
          const res = await fetch('/api/cms-health', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            server = (await res.json()) as IntegrationHealthReport;
          } else {
            const body = await res.json().catch(() => ({}));
            throw new Error(typeof body.error === 'string' ? body.error : 'Health check unavailable.');
          }
        }
        let storage: IntegrationCheck;
        try {
          const { error } = await supabase.storage.from(LANDING_MEDIA_BUCKET).list('', { limit: 1 });
          storage = clientStorageCheck({ ok: !error, errorMessage: error?.message });
        } catch (err) {
          storage = clientStorageCheck({
            ok: false,
            errorMessage: err instanceof Error ? err.message : 'Storage probe failed.',
          });
        }
        if (!cancelled) setHealth(mergeHealthReports(server, storage));
      } catch (err) {
        if (!cancelled) setHealthError(err instanceof Error ? err.message : 'Health check failed.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={16} className="text-brand-blue" />
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Recent activity</h2>
        </div>
        {activityError ? <p className="text-sm text-red-700">{activityError}</p> : null}
        {!activityError && activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recorded actions yet. Publish, schedule, trash, or restore to start the log.</p>
        ) : null}
        <ul className="space-y-2">
          {activity.map((row) => (
            <li key={row.id} className="border-b border-slate-100 pb-2 text-sm last:border-0">
              <div className="font-semibold text-slate-800">{formatActivityLabel(row.action)}</div>
              <div className="text-xs text-slate-500">
                {format(new Date(row.created_at), 'MMM d, yyyy h:mm a')}
                {typeof row.meta?.title === 'string' ? ` · ${row.meta.title}` : null}
                {typeof row.meta?.slug === 'string' ? ` · /${row.meta.slug}` : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <PlugZap size={16} className="text-brand-blue" />
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Integration status</h2>
        </div>
        {healthError ? <p className="text-sm text-red-700">{healthError}</p> : null}
        <ul className="space-y-3">
          {(health?.checks ?? []).map((check) => (
            <li key={check.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{check.label}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${statusClass(check.status)}`}>
                  {check.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">{check.detail}</p>
              {check.status !== 'ok' && check.recovery ? (
                <p className="mt-1 text-xs text-slate-500">{check.recovery}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
