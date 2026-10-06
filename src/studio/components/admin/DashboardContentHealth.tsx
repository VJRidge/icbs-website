import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PUBLISHED_CONTENTS_VIEW } from '../../../lib/publishedContent';
import {
  resolvePublishedPublicPath,
  type DiscoveryPublishedRow,
} from '../../../lib/discovery/publicUrls';
import { evaluateBrokenInternalLinks } from '../../../lib/discovery/linkCheck';
import {
  evaluateContentHealth,
  type ContentHealthAlert,
  type ContentHealthRecord,
  type MediaUsageProbe,
} from '../../lib/cms/contentHealth';

async function loadHealthAlerts(): Promise<ContentHealthAlert[]> {
  const { data: contentRows, error: contentError } = await supabase
    .from('contents')
    .select(
      'id, kind, title, slug, status, content_blocks, structured_fields, content_type_id, published_document, updated_at',
    )
    .neq('status', 'trash')
    .order('updated_at', { ascending: false })
    .limit(100);

  let rows: Array<Record<string, unknown>> | null = (contentRows as Array<Record<string, unknown>> | null) ?? null;
  if (contentError) {
    const fallback = await supabase
      .from('contents')
      .select('id, kind, title, slug, status, content_blocks, published_document, updated_at')
      .neq('status', 'trash')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (fallback.error) throw fallback.error;
    rows = (fallback.data as Array<Record<string, unknown>> | null) ?? [];
  }

  const typeIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => (r as { content_type_id?: string | null }).content_type_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const typeKeyById = new Map<string, string>();
  if (typeIds.length > 0) {
    const { data: types } = await supabase.from('content_types').select('id, key').in('id', typeIds);
    for (const t of types ?? []) typeKeyById.set(t.id, t.key);
  }

  const records: ContentHealthRecord[] = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const typeId = typeof r.content_type_id === 'string' ? r.content_type_id : null;
    return {
      id: String(r.id),
      kind: String(r.kind),
      title: String(r.title ?? ''),
      slug: String(r.slug ?? ''),
      status: String(r.status ?? 'draft'),
      content_blocks: Array.isArray(r.content_blocks) ? (r.content_blocks as unknown[]) : [],
      structured_fields:
        r.structured_fields && typeof r.structured_fields === 'object'
          ? (r.structured_fields as Record<string, unknown>)
          : {},
      content_type_key: typeId ? typeKeyById.get(typeId) ?? null : null,
      updated_at: typeof r.updated_at === 'string' ? r.updated_at : null,
    };
  });

  const media: MediaUsageProbe[] = [];
  const { data: mediaRows, error: mediaError } = await supabase
    .from('media')
    .select('id, title, path')
    .order('created_at', { ascending: false })
    .limit(50);
  if (!mediaError && mediaRows && mediaRows.length > 0) {
    const ids = mediaRows.map((m) => m.id);
    const { data: usageRows } = await supabase.from('media_usages').select('media_id').in('media_id', ids);
    const usageCount = new Map<string, number>();
    for (const u of usageRows ?? []) {
      usageCount.set(u.media_id, (usageCount.get(u.media_id) ?? 0) + 1);
    }
    for (const m of mediaRows) {
      media.push({
        mediaId: m.id,
        title: m.title,
        path: m.path,
        usageCount: usageCount.get(m.id) ?? 0,
      });
    }
  }

  const baseAlerts = evaluateContentHealth({ records, media });

  const [{ data: settings }, { data: publishedRows }] = await Promise.all([
    supabase.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle(),
    supabase
      .from(PUBLISHED_CONTENTS_VIEW)
      .select('id, kind, slug, title, public_path, content_type_key, published_at')
      .limit(2000),
  ]);
  const homepageContentId =
    (settings as { homepage_content_id?: string | null } | null)?.homepage_content_id ?? null;
  const publishedPaths = new Set<string>();
  for (const row of (publishedRows as DiscoveryPublishedRow[] | null) ?? []) {
    const path = resolvePublishedPublicPath(row, { homepageContentId });
    if (path) publishedPaths.add(path);
  }

  const linkRecords = (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const typeId = typeof r.content_type_id === 'string' ? r.content_type_id : null;
    return {
      id: String(r.id),
      kind: String(r.kind),
      title: String(r.title ?? ''),
      slug: String(r.slug ?? ''),
      status: String(r.status ?? 'draft'),
      content_type_key: typeId ? typeKeyById.get(typeId) ?? null : null,
      published_document: r.published_document ?? null,
      content_blocks: r.content_blocks ?? null,
    };
  });

  const linkAlerts = evaluateBrokenInternalLinks({
    siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://vettajimale.tech',
    publishedPaths,
    records: linkRecords,
  });

  return [...baseAlerts, ...linkAlerts];
}

/** Actionable checks from real content — no fabricated dashboard metrics. */
export default function DashboardContentHealth() {
  const [alerts, setAlerts] = useState<ContentHealthAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await loadHealthAlerts();
        if (!cancelled) setAlerts(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load content health.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <HeartPulse size={16} className="text-brand-blue" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Content health</h2>
      </div>
      {loading ? <p className="text-sm text-slate-500">Checking content…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!loading && !error && alerts.length === 0 ? (
        <p className="text-sm text-slate-500">No actionable issues in the latest content sample.</p>
      ) : null}
      <ul className="space-y-3">
        {alerts.slice(0, 12).map((alert) => (
          <li key={alert.id} className="border-b border-slate-100 pb-3 last:border-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  alert.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                }`}
              >
                {alert.code.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">{alert.detail}</p>
            <Link to={alert.href} className="mt-1 inline-block text-xs font-semibold text-brand-blue hover:underline">
              Open record
            </Link>
          </li>
        ))}
      </ul>
      {alerts.length > 12 ? (
        <p className="mt-2 text-[11px] text-slate-500">Showing 12 of {alerts.length} issues from the latest sample.</p>
      ) : null}
    </section>
  );
}
