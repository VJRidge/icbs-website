import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { CHART } from './analyticsChartTheme';
import { percentDelta } from '../../../lib/analytics/siteTraffic';

export function AnalyticsKpiCard({
  label,
  value,
  previous,
  spark,
  footer,
  format = 'number',
}: {
  label: string;
  value: number;
  previous?: number;
  spark?: number[];
  footer?: string;
  format?: 'number' | 'percent';
}) {
  const delta = previous != null ? percentDelta(value, previous) : null;
  const display =
    format === 'percent'
      ? `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
      : value.toLocaleString();
  const sparkData = (spark || []).map((v, i) => ({ i, v }));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-900">{display}</p>
          {delta != null ? (
            <p className={`mt-1 text-xs font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {delta >= 0 ? '+' : ''}
              {delta}
              {format === 'percent' ? ' pp' : '%'} vs prior
            </p>
          ) : null}
          {footer ? <p className="mt-1 text-[11px] text-slate-500">{footer}</p> : null}
        </div>
        {sparkData.length > 1 ? (
          <div className="h-12 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={CHART.navy}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}
