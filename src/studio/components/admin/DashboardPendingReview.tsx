import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { editorHrefForRecord } from '../../lib/cms/contentHealth';

type QueueRow = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  updated_at: string;
  content_type_id: string | null;
  content_type_key: string | null;
};

/** Single-step review queue: pending_review → publish-capable staff. */
export default function DashboardPendingReview() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error: loadError } = await supabase
          .from('contents')
          .select('id, kind, title, slug, updated_at, content_type_id')
          .eq('status', 'pending_review')
          .order('updated_at', { ascending: true })
          .limit(25);
        if (loadError) throw loadError;
        const list = (data ?? []) as Array<{
          id: string;
          kind: string;
          title: string;
          slug: string;
          updated_at: string;
          content_type_id: string | null;
        }>;
        const typeIds = [...new Set(list.map((r) => r.content_type_id).filter(Boolean))] as string[];
        const typeKeyById = new Map<string, string>();
        if (typeIds.length > 0) {
          const { data: types } = await supabase.from('content_types').select('id, key').in('id', typeIds);
          for (const t of types ?? []) typeKeyById.set(t.id, t.key);
        }
        if (!cancelled) {
          setRows(
            list.map((r) => ({
              ...r,
              content_type_key: r.content_type_id ? typeKeyById.get(r.content_type_id) ?? null : null,
            })),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load review queue.');
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
        <Inbox size={16} className="text-brand-blue" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Pending review</h2>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading queue…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-slate-500">No items waiting for review.</p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="border-b border-slate-100 pb-3 last:border-0">
            <p className="text-sm font-semibold text-slate-800">{row.title || 'Untitled'}</p>
            <p className="text-xs text-slate-500">
              {row.kind}
              {row.content_type_key ? ` · ${row.content_type_key}` : ''} · {row.slug || 'no-slug'}
            </p>
            <Link
              to={editorHrefForRecord({
                id: row.id,
                kind: row.kind,
                content_type_key: row.content_type_key,
              })}
              className="mt-1 inline-block text-xs font-semibold text-brand-blue hover:underline"
            >
              Open for review
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
