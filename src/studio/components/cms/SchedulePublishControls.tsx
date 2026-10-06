import { useState } from 'react';
import { nextDocVersion, assertWriteMatchedRow } from '../../lib/cms/pageLifecycle';
import { schedulePublishPatch } from '../../lib/cms/schedulePublish';
import { recordActivity } from '../../lib/cms/activityLog';
import { supabase } from '../../lib/supabase';
import type { PublishedPageDocument, PublisherSitePage } from '../../types';

type Props = {
  contentId: string | null;
  docVersion: number | null | undefined;
  currentStatus: string;
  currentPublishedDocument?: PublishedPageDocument | null;
  canSchedule: boolean;
  actorId?: string | null;
  contentKind?: string;
  title?: string;
  buildSnapshot: () => PublishedPageDocument | null;
  onScheduled: (row: PublisherSitePage) => void;
};

/** Thin schedule control — freezes a snapshot without taking a live page offline. */
export default function SchedulePublishControls({
  contentId,
  docVersion,
  currentStatus,
  currentPublishedDocument,
  canSchedule,
  actorId,
  contentKind,
  title,
  buildSnapshot,
  onScheduled,
}: Props) {
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);

  if (!canSchedule || !contentId) return null;

  const onSchedule = async () => {
    const document = buildSnapshot();
    if (!document) {
      window.alert('Add a title and content before scheduling.');
      return;
    }
    if (!when) {
      window.alert('Choose a date and time to publish.');
      return;
    }
    setBusy(true);
    try {
      const expectedVersion = Math.max(1, Number(docVersion) || 1);
      const patch = schedulePublishPatch({
        scheduledFor: new Date(when).toISOString(),
        pendingDocument: document,
        currentStatus,
        currentPublishedDocument,
        docVersion: nextDocVersion(expectedVersion),
      });
      const { data, error } = await supabase
        .from('contents')
        .update({
          status: patch.status,
          scheduled_for: patch.scheduled_for,
          published_document: patch.published_document,
          published_at: patch.published_at,
          doc_version: patch.doc_version,
        })
        .eq('id', contentId)
        .eq('doc_version', expectedVersion)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      const row = assertWriteMatchedRow(data) as PublisherSitePage;
      try {
        await supabase.from('content_publish_jobs').upsert(
          {
            content_id: contentId,
            scheduled_for: patch.scheduled_for,
            status: 'pending',
            attempts: 0,
          },
          { onConflict: 'content_id,scheduled_for' },
        );
      } catch {
        /* outbox optional until migration applied */
      }
      void recordActivity({
        actorId,
        action: 'content.schedule',
        entity: 'contents',
        entityId: contentId,
        meta: { kind: contentKind, title, scheduled_for: patch.scheduled_for },
      });
      onScheduled(row);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not schedule publish.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="cms-schedule-at">
        Schedule publish at
      </label>
      <input
        id="cms-schedule-at"
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs shadow-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSchedule()}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-brand-blue/40 disabled:opacity-50"
      >
        {busy ? 'Scheduling…' : 'Schedule'}
      </button>
    </div>
  );
}
