import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Download } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import AnalyticsFunnelPanel from '../components/admin/AnalyticsFunnelPanel';
import AnalyticsNewsletterPanel from '../components/admin/AnalyticsNewsletterPanel';
import AnalyticsSitePanel from '../components/admin/AnalyticsSitePanel';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { canReadAnalytics } from '../lib/cms/authorization';
import {
  aggregateFunnel,
  attributeByContent,
  type ConversionEventRow,
} from '../../lib/analytics/conversionEvents';
import {
  aggregateNewsletterByIssue,
  aggregateNewsletterDelivery,
  emptyNewsletterDeliveryTotals,
  type NewsletterIssueRow,
  type NewsletterJobRow,
  type NewsletterProviderEventRow,
} from '../../lib/analytics/newsletterStats';
import {
  sampleFunnel,
  sampleNewsletterBundle,
  sampleSiteBundle,
} from '../../lib/analytics/sampleAnalytics';
import {
  aggregateTrafficTotals,
  aggregateViewsByDay,
  deviceBreakdown,
  topPaths,
  topReferrers,
  topUtmSources,
  type DayBucket,
  type TrafficEventRow,
} from '../../lib/analytics/siteTraffic';
import type { UserProfile } from '../types';

type MetricDef = { key: string; label: string; description: string; event_name: string };
type Tab = 'site' | 'newsletters' | 'funnel';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function periodLabel(days: number): string {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function AnalyticsPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [days, setDays] = useState(30);
  const tabParam = searchParams.get('tab');
  const tab: Tab =
    tabParam === 'newsletters' || tabParam === 'funnel' || tabParam === 'site' ? tabParam : 'site';
  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'site') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };
  /** Default on so empty installs still show the mockup layout immediately. */
  const [useSample, setUseSample] = useState(true);
  const [sampleForcedOff, setSampleForcedOff] = useState(false);
  const [events, setEvents] = useState<ConversionEventRow[]>([]);
  const [prevEvents, setPrevEvents] = useState<TrafficEventRow[]>([]);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [issues, setIssues] = useState<NewsletterIssueRow[]>([]);
  const [jobs, setJobs] = useState<NewsletterJobRow[]>([]);
  const [providerEvents, setProviderEvents] = useState<NewsletterProviderEventRow[]>([]);
  const [unsubscribed, setUnsubscribed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = canReadAnalytics(userProfile?.role, {
    staffApproved: isAnyAdminProfile(userProfile),
  });

  const load = useCallback(async () => {
    const since = daysAgoIso(days);
    const prevSince = daysAgoIso(days * 2);
    const prevUntil = since;

    const [metricRes, eventRes, prevRes, issueRes, jobRes, providerRes, unsubRes] = await Promise.all([
      supabase.from('metric_definitions').select('key, label, description, event_name').eq('active', true).order('key'),
      supabase
        .from('conversion_events')
        .select(
          'name, path, referrer, session_id, utm_source, utm_medium, utm_campaign, utm_content, user_agent, bot_suspect, occurred_at',
        )
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(8000),
      supabase
        .from('conversion_events')
        .select('name, path, referrer, session_id, user_agent, bot_suspect, occurred_at')
        .gte('occurred_at', prevSince)
        .lt('occurred_at', prevUntil)
        .eq('name', 'page_view')
        .limit(8000),
      supabase
        .from('newsletter_issues')
        .select('id, name, subject, status, sent_at, recipient_count, list_id')
        .in('status', ['sent', 'sending', 'scheduled', 'draft'])
        .order('sent_at', { ascending: false, nullsFirst: false })
        .limit(200),
      supabase
        .from('newsletter_send_jobs')
        .select('issue_id, status, sent_at, created_at')
        .gte('created_at', since)
        .limit(10000),
      supabase
        .from('newsletter_provider_events')
        .select('event_type, issue_id, email, occurred_at')
        .gte('occurred_at', since)
        .limit(10000),
      supabase
        .from('contact_consent_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'suppressed')
        .gte('occurred_at', since),
    ]);

    if (metricRes.error) {
      setError(metricRes.error.message);
      return;
    }
    if (eventRes.error) {
      setError(eventRes.error.message);
      setEvents([]);
      return;
    }

    const jobRows = (jobRes.data as NewsletterJobRow[]) ?? [];
    const issueIdsFromJobs = new Set(jobRows.map((j) => j.issue_id));
    const issueRows = ((issueRes.data as NewsletterIssueRow[]) ?? []).filter((issue) => {
      if (issueIdsFromJobs.has(issue.id)) return true;
      if (issue.sent_at && issue.sent_at >= since) return true;
      return issue.status === 'draft' || issue.status === 'scheduled';
    });

    const liveEvents = (eventRes.data as ConversionEventRow[]) ?? [];
    setMetrics((metricRes.data as MetricDef[]) ?? []);
    setEvents(liveEvents);
    setPrevEvents((prevRes.data as TrafficEventRow[]) ?? []);
    setIssues(issueRows);
    setJobs(jobRows);
    setProviderEvents((providerRes.data as NewsletterProviderEventRow[]) ?? []);
    setUnsubscribed(typeof unsubRes.count === 'number' ? unsubRes.count : 0);

    const liveViews = liveEvents.filter((e) => e.name === 'page_view' && !e.bot_suspect).length;
    if (!sampleForcedOff && liveViews === 0) setUseSample(true);

    const softErrors = [issueRes.error, jobRes.error, providerRes.error, prevRes.error, unsubRes.error]
      .filter(Boolean)
      .map((e) => e!.message);
    setError(softErrors.length ? softErrors.join(' · ') : null);
  }, [days, sampleForcedOff]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [userProfile, allowed, load]);

  const sampleSite = useMemo(() => sampleSiteBundle(days), [days]);
  const sampleNl = useMemo(() => sampleNewsletterBundle(), []);
  const sampleFn = useMemo(() => sampleFunnel(), []);

  const trafficEvents = events as TrafficEventRow[];
  const liveSiteTotals = useMemo(() => aggregateTrafficTotals(trafficEvents), [trafficEvents]);
  const livePrevTotals = useMemo(() => aggregateTrafficTotals(prevEvents), [prevEvents]);
  const liveByDay = useMemo(() => aggregateViewsByDay(trafficEvents), [trafficEvents]);
  const livePrevByDay = useMemo(() => aggregateViewsByDay(prevEvents), [prevEvents]);
  const livePaths = useMemo(() => topPaths(trafficEvents), [trafficEvents]);
  const liveReferrers = useMemo(() => topReferrers(trafficEvents), [trafficEvents]);
  const liveUtm = useMemo(() => topUtmSources(trafficEvents), [trafficEvents]);
  const liveDevices = useMemo(() => deviceBreakdown(trafficEvents), [trafficEvents]);

  const liveNewsletterTotals = useMemo(
    () => aggregateNewsletterDelivery({ jobs, events: providerEvents, unsubscribed }),
    [jobs, providerEvents, unsubscribed],
  );
  const liveNewsletterRows = useMemo(
    () => aggregateNewsletterByIssue({ issues, jobs, events: providerEvents }),
    [issues, jobs, providerEvents],
  );

  const funnel = useMemo(
    () => (useSample ? sampleFn.funnel : aggregateFunnel(events)),
    [useSample, sampleFn.funnel, events],
  );
  const attribution = useMemo(
    () => (useSample ? sampleFn.attribution : attributeByContent(events)),
    [useSample, sampleFn.attribution, events],
  );

  const emptyDay: DayBucket[] = [];

  if (!isAnyAdminProfile(userProfile) || !allowed) {
    return (
      <AdminCmsShell title="Analytics" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">You do not have permission to view analytics.</p>
      </AdminCmsShell>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'site', label: 'Overview' },
    { id: 'newsletters', label: 'Newsletters' },
    { id: 'funnel', label: 'Conversions' },
  ];

  return (
    <AdminCmsShell
      title="Analytics"
      titleIcon={<BarChart3 size={14} className="text-brand-yellow" />}
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Workspace / Analytics</p>
            <h1 className="mt-1 font-serif text-3xl font-black text-slate-900">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Understand your audience. See what is working — from stored first-party rows
              {useSample ? ' (sample preview on)' : ''}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                useSample
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'border border-slate-300 text-slate-700'
              }`}
              onClick={() => {
                const next = !useSample;
                setUseSample(next);
                setSampleForcedOff(!next);
              }}
            >
              Sample data
            </button>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Period
              <select
                className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
              {periodLabel(days)}
            </span>
            {tab === 'newsletters' ? (
              <Link
                to="/admin/newsletter"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
              >
                + Create newsletter
              </Link>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white"
                onClick={() => window.print()}
              >
                <Download size={12} /> Export report
              </button>
            )}
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-slate-200" aria-label="Analytics sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`border-b-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error ? <p className="mt-4 text-sm text-amber-800">{error}</p> : null}
        {loading && !useSample ? <p className="mt-6 text-sm text-slate-500">Loading…</p> : null}

        {(useSample || !loading) && tab === 'site' ? (
          <div className="mt-6">
            <AnalyticsSitePanel
              totals={useSample ? sampleSite.totals : liveSiteTotals}
              previousTotals={useSample ? sampleSite.previousTotals : livePrevTotals}
              byDay={useSample ? sampleSite.byDay : liveByDay}
              prevByDay={useSample ? sampleSite.prevByDay : livePrevByDay}
              paths={useSample ? sampleSite.paths : livePaths}
              referrers={useSample ? sampleSite.referrers : liveReferrers}
              utm={useSample ? sampleSite.utm : liveUtm}
              devices={useSample ? sampleSite.devices : liveDevices}
              locations={useSample ? sampleSite.locations : []}
              campaigns={useSample ? sampleSite.campaigns : []}
              subscribers={useSample ? sampleSite.subscribers : funnel.kitSubscribes || funnel.contactsCreated}
              downloads={useSample ? sampleSite.downloads : funnel.bookPurchases}
              prevSubscribers={useSample ? sampleSite.prevSubscribers : Math.max(0, (funnel.kitSubscribes || 0) - 20)}
              prevDownloads={useSample ? sampleSite.prevDownloads : Math.max(0, funnel.bookPurchases - 10)}
              sampleMode={useSample}
            />
          </div>
        ) : null}

        {(useSample || !loading) && tab === 'newsletters' ? (
          <div className="mt-6">
            <AnalyticsNewsletterPanel
              totals={useSample ? sampleNl.totals : liveNewsletterTotals}
              previous={useSample ? sampleNl.previous : emptyNewsletterDeliveryTotals()}
              rows={useSample ? sampleNl.rows : liveNewsletterRows}
              topicSubs={useSample ? sampleNl.topicSubs : []}
              audienceGrowth={useSample ? sampleNl.audienceGrowth : emptyDay}
              prevAudienceGrowth={useSample ? sampleNl.prevAudienceGrowth : emptyDay}
              upcoming={
                useSample
                  ? sampleNl.upcoming
                  : liveNewsletterRows
                      .filter((r) => r.status === 'scheduled')
                      .slice(0, 3)
                      .map((r) => ({ title: r.title, when: 'Scheduled' }))
              }
              automations={useSample ? sampleNl.automations : []}
              sampleMode={useSample}
              activeSubscribers={useSample ? 8420 : undefined}
            />
          </div>
        ) : null}

        {(useSample || !loading) && tab === 'funnel' ? (
          <div className="mt-6">
            <AnalyticsFunnelPanel funnel={funnel} attribution={attribution} metrics={metrics} />
          </div>
        ) : null}
      </div>
    </AdminCmsShell>
  );
}
