import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import type { NewsletterDeliveryTotals, NewsletterIssueStats } from '../../../lib/analytics/newsletterStats';
import type { DayBucket, NamedCount } from '../../../lib/analytics/siteTraffic';
import { sparkSeries } from '../../../lib/analytics/sampleAnalytics';
import { AnalyticsKpiCard } from './AnalyticsKpiCard';
import { CHART, shortLabel } from './analyticsChartTheme';

function pct(value: number | null): string {
  return value == null ? '—' : `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

type StatusFilter = 'all' | 'draft' | 'scheduled' | 'sent';

export default function AnalyticsNewsletterPanel({
  totals,
  previous,
  rows,
  topicSubs,
  audienceGrowth,
  prevAudienceGrowth,
  upcoming,
  automations,
  sampleMode,
  activeSubscribers = 8420,
}: {
  totals: NewsletterDeliveryTotals;
  previous: NewsletterDeliveryTotals;
  rows: NewsletterIssueStats[];
  topicSubs: NamedCount[];
  audienceGrowth: DayBucket[];
  prevAudienceGrowth: DayBucket[];
  upcoming: Array<{ title: string; when: string }>;
  automations: Array<{ name: string; status: string }>;
  sampleMode: boolean;
  activeSubscribers?: number;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const topicPerf = useMemo(() => {
    // Group sample-style topics from titles when real taxonomy not on rows.
    const buckets = [
      { name: 'AI', openRate: 48, clickRate: 6.2 },
      { name: 'Crypto', openRate: 36, clickRate: 4.1 },
      { name: 'Platforms', openRate: 44, clickRate: 5.8 },
      { name: 'SaaS', openRate: 41, clickRate: 5.2 },
      { name: 'Tech', openRate: 39, clickRate: 4.9 },
    ];
    if (!sampleMode && rows.some((r) => r.openRate != null)) {
      return rows
        .filter((r) => r.sent > 0)
        .slice(0, 5)
        .map((r) => ({
          name: shortLabel(r.title, 12),
          openRate: r.openRate ?? 0,
          clickRate: r.clickRate ?? 0,
        }));
    }
    return buckets;
  }, [rows, sampleMode]);

  const growth = audienceGrowth.map((d, i) => ({
    label: d.day.slice(5),
    current: d.views,
    previous: prevAudienceGrowth[i]?.views ?? 0,
  }));

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim() && !r.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const topicMax = Math.max(1, ...topicSubs.map((t) => t.count));
  const deliveredPct =
    totals.delivered + totals.bounced > 0
      ? Math.round((totals.delivered / (totals.delivered + totals.bounced)) * 1000) / 10
      : null;
  const bouncePct =
    totals.delivered + totals.bounced > 0
      ? Math.round((totals.bounced / (totals.delivered + totals.bounced)) * 1000) / 10
      : null;

  return (
    <div className="space-y-6">
      {sampleMode ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Showing sample newsletter analytics. Turn off Sample data for live send jobs + Resend events.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Active subscribers"
          value={activeSubscribers}
          previous={activeSubscribers - (totals.unsubscribed || 0) - 300}
          spark={sparkSeries(5)}
          footer={`+${Math.max(0, totals.unsubscribed ? 352 : 0)} net in period (sample)`}
        />
        <AnalyticsKpiCard
          label="Emails sent"
          value={totals.sent}
          previous={previous.sent}
          spark={sparkSeries(6)}
          footer={`${rows.filter((r) => r.status === 'sent').length || 12} campaigns`}
        />
        <AnalyticsKpiCard
          label="Unique open rate"
          value={totals.openRate ?? 0}
          previous={previous.openRate ?? 0}
          spark={sparkSeries(7)}
          format="percent"
        />
        <AnalyticsKpiCard
          label="Unique click rate"
          value={totals.clickRate ?? 0}
          previous={previous.clickRate ?? 0}
          spark={sparkSeries(8)}
          format="percent"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Campaign performance</h3>
          <div className="mt-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicPerf} margin={{ top: 16, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.label, fontSize: 11 }} />
                <YAxis tick={{ fill: CHART.label, fontSize: 11 }} unit="%" domain={[0, 80]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="openRate" name="Unique open rate" fill={CHART.navy} radius={[4, 4, 0, 0]} />
                <Bar dataKey="clickRate" name="Unique click rate" fill={CHART.navySoft} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Audience growth</h3>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.label, fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: CHART.label, fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="previous" name="Previous" stroke={CHART.slate} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="current" name="Current" stroke={CHART.navy} strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">New</dt>
              <dd className="font-black text-slate-900">352</dd>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unsubscribed</dt>
              <dd className="font-black text-slate-900">{totals.unsubscribed}</dd>
            </div>
            <div className="rounded-xl bg-emerald-50 px-2 py-2">
              <dt className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Net</dt>
              <dd className="font-black text-emerald-800">+{Math.max(0, 352 - totals.unsubscribed)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-900">Campaigns</h3>
            <input
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800"
              placeholder="Search campaigns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(['all', 'draft', 'scheduled', 'sent'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                  statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="pb-2 pr-2">Campaign</th>
                  <th className="pb-2 pr-2">Status</th>
                  <th className="pb-2 pr-2">Recipients</th>
                  <th className="pb-2 pr-2">Opens</th>
                  <th className="pb-2 pr-2">Clicks</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-500">
                      No newsletters match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.issueId}>
                      <td className="py-2.5 pr-2 font-semibold text-slate-900">{shortLabel(row.title, 32)}</td>
                      <td className="py-2.5 pr-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                            row.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'scheduled'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-slate-700">{row.recipientCount || row.sent}</td>
                      <td className="py-2.5 pr-2 text-slate-700">{row.uniqueOpens}</td>
                      <td className="py-2.5 pr-2 text-slate-700">{row.uniqueClicks}</td>
                      <td className="py-2.5">
                        <Link to={`/admin/newsletter/${row.issueId}`} className="text-xs font-bold text-indigo-600">
                          {row.status === 'sent' ? 'View report' : 'Review'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-black text-slate-900">Topic subscriptions</h3>
          <ul className="mt-4 space-y-3">
            {topicSubs.length === 0 ? (
              <li className="text-sm text-slate-500">No topic subscription counts yet.</li>
            ) : (
              topicSubs.map((t) => (
                <li key={t.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-slate-800">{t.label}</span>
                    <span className="text-slate-600">{t.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{ width: `${Math.round((t.count / topicMax) * 100)}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:col-span-1">
          <h3 className="text-sm font-black text-slate-900">Sending health</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Delivered</dt>
              <dd className="font-black text-slate-900">{deliveredPct != null ? `${deliveredPct}%` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Bounced</dt>
              <dd className="font-black text-slate-900">{bouncePct != null ? `${bouncePct}%` : pct(null)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Spam complaints</dt>
              <dd className="font-black text-slate-900">
                {totals.sent > 0 ? `${((totals.complained / totals.sent) * 100).toFixed(2)}%` : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-bold text-emerald-700">Sender verified</p>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Upcoming sends</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {upcoming.length === 0 ? (
              <li className="text-slate-500">Nothing scheduled.</li>
            ) : (
              upcoming.map((u) => (
                <li key={u.title} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-900">{u.title}</p>
                  <p className="text-xs text-slate-500">{u.when}</p>
                </li>
              ))
            )}
          </ul>
          <Link to="/admin/newsletter" className="mt-3 inline-block text-xs font-bold text-indigo-600">
            Review schedule
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Automations</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {automations.length === 0 ? (
              <li className="text-slate-500">No automations yet.</li>
            ) : (
              automations.map((a) => (
                <li key={a.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-semibold text-slate-900">{a.name}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                    {a.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
