import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import type { DayBucket, NamedCount, TrafficTotals } from '../../../lib/analytics/siteTraffic';
import { percentDelta } from '../../../lib/analytics/siteTraffic';
import { sparkSeries } from '../../../lib/analytics/sampleAnalytics';
import { AnalyticsKpiCard } from './AnalyticsKpiCard';
import { CHART, shortLabel } from './analyticsChartTheme';

export default function AnalyticsSitePanel({
  totals,
  previousTotals,
  byDay,
  prevByDay,
  paths,
  referrers,
  utm,
  devices,
  locations,
  campaigns,
  subscribers,
  downloads,
  prevSubscribers,
  prevDownloads,
  sampleMode,
}: {
  totals: TrafficTotals;
  previousTotals: TrafficTotals;
  byDay: DayBucket[];
  prevByDay: DayBucket[];
  paths: NamedCount[];
  referrers: NamedCount[];
  utm: NamedCount[];
  devices: NamedCount[];
  locations: NamedCount[];
  campaigns: Array<{ name: string; signups: number }>;
  subscribers: number;
  downloads: number;
  prevSubscribers: number;
  prevDownloads: number;
  sampleMode: boolean;
}) {
  const [series, setSeries] = useState<'views' | 'visitors'>('views');

  const growthData = byDay.map((d, i) => ({
    label: d.day.slice(5),
    current: series === 'views' ? d.views : d.visitors,
    previous: series === 'views' ? prevByDay[i]?.views ?? 0 : prevByDay[i]?.visitors ?? 0,
  }));

  const referrerTotal = Math.max(1, referrers.reduce((s, r) => s + r.count, 0));
  const pathMax = Math.max(1, ...paths.map((p) => p.count));
  const deviceTotal = devices.reduce((s, d) => s + d.count, 0);
  const deviceData = devices.map((d) => ({ name: d.label, value: d.count }));

  return (
    <div className="space-y-6">
      {sampleMode ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Showing sample data so you can preview the layout. Turn off Sample data to use live rows only.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Page views"
          value={totals.views}
          previous={previousTotals.views}
          spark={sparkSeries(1)}
        />
        <AnalyticsKpiCard
          label="Visitors"
          value={totals.visitors}
          previous={previousTotals.visitors}
          spark={sparkSeries(2)}
        />
        <AnalyticsKpiCard
          label="New subscribers"
          value={subscribers}
          previous={prevSubscribers}
          spark={sparkSeries(3)}
        />
        <AnalyticsKpiCard
          label="Downloads"
          value={downloads}
          previous={prevDownloads}
          spark={sparkSeries(4)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-900">Audience growth</h3>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
              {(['views', 'visitors'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    series === key ? 'bg-indigo-600 text-white' : 'text-slate-600'
                  }`}
                  onClick={() => setSeries(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-72 w-full">
            {growthData.length === 0 ? (
              <p className="pt-16 text-center text-sm text-slate-500">No page views in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: CHART.label, fontSize: 10 }} interval={Math.max(0, Math.floor(growthData.length / 8))} />
                  <YAxis tick={{ fill: CHART.label, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    name="Previous period"
                    stroke={CHART.slate}
                    fill={CHART.slate}
                    fillOpacity={0.08}
                    strokeDasharray="4 4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    name="Current period"
                    stroke={CHART.navy}
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-black text-slate-900">Traffic sources</h3>
          <ul className="mt-4 space-y-3">
            {referrers.length === 0 ? (
              <li className="text-sm text-slate-500">No referrers yet.</li>
            ) : (
              referrers.map((r) => {
                const pct = Math.round((r.count / referrerTotal) * 100);
                return (
                  <li key={r.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">{r.label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          {utm.length > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              Top UTM: {utm.slice(0, 2).map((u) => u.label).join(' · ')}
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Top content</h3>
          {paths.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No paths yet.</p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="pb-2">Page</th>
                  <th className="pb-2">Views</th>
                  <th className="pb-2">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paths.map((p) => (
                  <tr key={p.key}>
                    <td className="py-2.5 pr-2 font-semibold text-slate-900">{shortLabel(p.label, 36)}</td>
                    <td className="py-2.5 pr-2 text-slate-700">{p.count.toLocaleString()}</td>
                    <td className="py-2.5">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.round((p.count / pathMax) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Audience locations</h3>
          <p className="mt-1 text-xs text-slate-500">
            {sampleMode ? 'Sample country mix (live geo not wired yet).' : 'Country breakdown when geo is enabled.'}
          </p>
          <ul className="mt-4 space-y-2">
            {(locations.length ? locations : [{ key: '—', label: 'No location data yet', count: 0 }]).map((loc) => (
              <li key={loc.key} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{loc.label}</span>
                <span className="text-slate-600">{loc.count}{loc.count && loc.count <= 100 ? '%' : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Devices</h3>
          <div className="relative mt-2 h-52">
            {deviceData.length === 0 ? (
              <p className="pt-16 text-center text-sm text-slate-500">No device data yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {deviceData.map((_, i) => (
                        <Cell key={deviceData[i].name} fill={CHART.pie[i % CHART.pie.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-900">{deviceTotal.toLocaleString()}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Views</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Top campaigns</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {campaigns.length === 0 ? (
              <li className="py-3 text-sm text-slate-500">No campaign attribution yet.</li>
            ) : (
              campaigns.map((c) => (
                <li key={c.name} className="flex justify-between py-2.5 text-sm">
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="text-slate-600">{c.signups} signups</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">Conversion snapshot</h3>
          <ol className="mt-4 space-y-3">
            {[
              ['Visitors', totals.visitors, previousTotals.visitors],
              ['Signups', subscribers, prevSubscribers],
              ['Downloads', downloads, prevDownloads],
            ].map(([label, value, prev], idx) => {
              const d = percentDelta(Number(value), Number(prev));
              return (
                <li key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-800">
                      {idx + 1}. {label}
                    </span>
                    <span className="font-black text-slate-900">{Number(value).toLocaleString()}</span>
                  </div>
                  {d != null ? (
                    <p className={`text-xs font-bold ${d >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {d >= 0 ? '+' : ''}
                      {d}%
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <Link to="/admin/analytics?tab=funnel" className="mt-3 inline-block text-xs font-bold text-indigo-600">
            Track the actions that matter →
          </Link>
        </section>
      </div>
    </div>
  );
}
