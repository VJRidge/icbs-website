import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canReadAnalytics } from '../lib/cms/authorization';
import {
  aggregateFunnel,
  attributeByContent,
  type ConversionEventRow,
} from '../../lib/analytics/conversionEvents';
import type { UserProfile } from '../types';

type MetricDef = { key: string; label: string; description: string; event_name: string };

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export default function AnalyticsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [days, setDays] = useState(30);
  const [events, setEvents] = useState<ConversionEventRow[]>([]);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canReadAnalytics(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const since = daysAgoIso(days);
    const { data: metricRows, error: metricError } = await supabase
      .from('metric_definitions')
      .select('key, label, description, event_name')
      .eq('active', true)
      .order('key');
    if (metricError) {
      setError(metricError.message);
      return;
    }
    setMetrics((metricRows as MetricDef[]) ?? []);

    const { data: eventRows, error: eventError } = await supabase
      .from('conversion_events')
      .select('name, path, utm_source, utm_medium, utm_campaign, utm_content, bot_suspect, occurred_at')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(5000);
    if (eventError) {
      setError(eventError.message);
      setEvents([]);
      return;
    }
    setError(null);
    setEvents((eventRows as ConversionEventRow[]) ?? []);
  }, [days]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  const funnel = useMemo(() => aggregateFunnel(events), [events]);
  const attribution = useMemo(() => attributeByContent(events), [events]);

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Analytics" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to view analytics.</p>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title="Analytics"
      titleIcon={<BarChart3 size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-black text-slate-900">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              First-party conversion events only. Counts are reproducible from stored rows — nothing is invented when
              data is missing.
            </p>
          </div>
          <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            Period
            <select
              className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        {!loading ? (
          <>
            <section className="mt-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Funnel</h2>
              {events.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                  No conversion events in this period yet. Visit <code>/updates</code> or submit a lead form to create
                  the first rows.
                </p>
              ) : (
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Page views', funnel.pageViews],
                    ['Form starts', funnel.formStarts],
                    ['Form submits', funnel.formSubmits],
                    ['Contacts created', funnel.contactsCreated],
                    ['Kit signups', funnel.kitSubscribes],
                    ['Bot-filtered events', funnel.botFiltered],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</dt>
                      <dd className="mt-1 text-2xl font-black text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {funnel.approximate ? (
                <p className="mt-3 text-xs text-amber-800">
                  Approximate: {funnel.botFiltered} bot-suspect event(s) excluded from primary funnel counts.
                </p>
              ) : null}
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">
                Content / campaign attribution
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Grouped by utm_content, blog path, or utm_campaign. Unknown when no attribute was stored.
              </p>
              {attribution.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No attributed submits in this period.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {attribution.map((row) => (
                    <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">{row.label}</span>
                      <span className="text-slate-600">
                        {row.formSubmits} submits · {row.contactsCreated} contacts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Metric definitions</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {metrics.map((m) => (
                  <li key={m.key} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <strong>{m.label}</strong> <span className="text-slate-400">({m.event_name})</span>
                    <div className="text-xs text-slate-500">{m.description}</div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
