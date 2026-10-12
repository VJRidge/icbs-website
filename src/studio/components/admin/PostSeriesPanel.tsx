import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SeriesOption = { id: string; name: string };

/** Assign a post as an edition of a recurring series. */
export default function PostSeriesPanel({ postId }: { postId: string | null }) {
  const [all, setAll] = useState<SeriesOption[]>([]);
  const [seriesId, setSeriesId] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from('series')
      .select('id, name')
      .order('sort_order')
      .order('name')
      .then(({ data }) => setAll((data as SeriesOption[]) ?? []));
  }, []);

  useEffect(() => {
    if (!postId) {
      setSeriesId('');
      setIssueNumber('');
      return;
    }
    void supabase
      .from('content_series')
      .select('series_id, issue_number')
      .eq('content_id', postId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setSeriesId('');
          setIssueNumber('');
          return;
        }
        setSeriesId(String(data.series_id || ''));
        setIssueNumber(data.issue_number == null ? '' : String(data.issue_number));
      });
  }, [postId]);

  const persist = async (nextSeriesId: string, nextIssue: string) => {
    if (!postId) return;
    setBusy(true);
    const n = nextIssue.trim() === '' ? null : Number(nextIssue);
    const issueNum = n != null && Number.isFinite(n) ? n : null;

    if (!nextSeriesId) {
      const { error } = await supabase.from('content_series').delete().eq('content_id', postId);
      setBusy(false);
      if (error) {
        window.alert(error.message);
        return;
      }
      setSeriesId('');
      setIssueNumber('');
      return;
    }

    const { error } = await supabase.from('content_series').upsert({
      content_id: postId,
      series_id: nextSeriesId,
      issue_number: issueNum,
    });
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setSeriesId(nextSeriesId);
    setIssueNumber(nextIssue);
  };

  return (
    <div className="space-y-2">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Layers size={11} /> Series
      </span>
      {!postId ? (
        <p className="text-[10px] text-slate-500">Save the post first, then assign a series.</p>
      ) : null}
      <select
        disabled={!postId || busy}
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-40"
        value={seriesId}
        onChange={(e) => void persist(e.target.value, issueNumber)}
      >
        <option value="">Not in a series</option>
        {all.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {seriesId ? (
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Issue #
          <input
            type="number"
            disabled={!postId || busy}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800 disabled:opacity-40"
            value={issueNumber}
            onChange={(e) => setIssueNumber(e.target.value)}
            onBlur={() => void persist(seriesId, issueNumber)}
            placeholder="Optional"
          />
        </label>
      ) : null}
      <p className="text-[10px] text-slate-400">Manage series under Content → Series.</p>
    </div>
  );
}
