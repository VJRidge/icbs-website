import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttributionBucket, FunnelCounts } from '../../../lib/analytics/conversionEvents';
import { CHART, shortLabel } from './analyticsChartTheme';

export default function AnalyticsFunnelPanel({
  funnel,
  attribution,
  metrics,
}: {
  funnel: FunnelCounts;
  attribution: AttributionBucket[];
  metrics: Array<{ key: string; label: string; description: string; event_name: string }>;
}) {
  const stages = [
    { name: 'Page views', count: funnel.pageViews },
    { name: 'Form starts', count: funnel.formStarts },
    { name: 'Form submits', count: funnel.formSubmits },
    { name: 'Contacts', count: funnel.contactsCreated },
    { name: 'Kit signups', count: funnel.kitSubscribes },
    { name: 'Purchases', count: funnel.bookPurchases },
  ];
  const attrBars = attribution.slice(0, 10).map((r) => ({
    name: shortLabel(r.label, 18),
    submits: r.formSubmits,
    contacts: r.contactsCreated,
  }));

  return (
    <div className="space-y-8">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Page views', funnel.pageViews],
          ['Form starts', funnel.formStarts],
          ['Form submits', funnel.formSubmits],
          ['Contacts created', funnel.contactsCreated],
          ['Kit signups', funnel.kitSubscribes],
          ['Book purchases', funnel.bookPurchases],
          ['Bot-filtered events', funnel.botFiltered],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</dt>
            <dd className="mt-1 text-2xl font-black text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {funnel.approximate ? (
        <p className="text-xs text-amber-800">
          Approximate: {funnel.botFiltered} bot-suspect event(s) excluded from primary funnel counts.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Funnel stages</h3>
        <div className="mt-3 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART.label, fontSize: 11 }} />
              <YAxis tick={{ fill: CHART.label, fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Count" fill={CHART.navy} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
          Content / campaign attribution
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Grouped by utm_content, blog path, or utm_campaign.
        </p>
        {attrBars.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No attributed submits in this period.</p>
        ) : (
          <div className="mt-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attrBars} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: CHART.label, fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fill: CHART.label, fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="submits" name="Submits" fill={CHART.navy} radius={[3, 3, 0, 0]} />
                <Bar dataKey="contacts" name="Contacts" fill={CHART.teal} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
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
    </div>
  );
}
