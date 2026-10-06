import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { History } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { restoreRevisionWorkingCopy } from '../../lib/cms/pageLifecycle';

type RevisionRow = {
  id: string;
  title: string | null;
  created_at: string;
  document: { blocks?: unknown; html?: unknown };
};

export default function ContentRevisionsPanel({
  contentId,
  disabled,
  onRestore,
}: {
  contentId: string | null;
  disabled?: boolean;
  onRestore: (working: { content_blocks: unknown[]; body: string }) => Promise<void>;
}) {
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId) {
      setRows([]);
      return;
    }
    let gone = false;
    void supabase
      .from('content_revisions')
      .select('id, title, created_at, document')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error: loadError }) => {
        if (gone) return;
        if (loadError) {
          setError(loadError.message);
          setRows([]);
          return;
        }
        setError(null);
        setRows((data as RevisionRow[]) ?? []);
      });
    return () => {
      gone = true;
    };
  }, [contentId]);

  if (!contentId) return null;

  return (
    <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <History size={12} /> Revisions
      </h3>
      <p className="text-xs text-slate-500">Restore replaces the working copy only. The live page does not change until you publish.</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {rows.length === 0 ? <p className="text-xs text-slate-500">No revisions yet.</p> : null}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-slate-600">
              {format(new Date(row.created_at), 'MMM d, yyyy h:mm a')}
              {row.title ? ` · ${row.title}` : ''}
            </span>
            <button
              type="button"
              disabled={disabled || restoring === row.id}
              onClick={() => {
                if (!window.confirm('Restore this revision into the working copy? The live page will not change until you publish.')) return;
                setRestoring(row.id);
                void onRestore(restoreRevisionWorkingCopy(row.document ?? {})).finally(() => setRestoring(null));
              }}
              className="shrink-0 font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
