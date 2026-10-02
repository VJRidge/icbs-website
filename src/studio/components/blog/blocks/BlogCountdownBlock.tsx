import { useEffect, useMemo, useState } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function useRemaining(targetMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (targetMs == null || !Number.isFinite(targetMs)) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [targetMs]);
  return useMemo(() => {
    if (targetMs == null || !Number.isFinite(targetMs)) return null;
    const diff = Math.max(0, targetMs - now);
    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return { days, hours, mins, secs, expired: diff <= 0 };
  }, [targetMs, now]);
}

export default function BlogCountdownBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const title = String(block.data.title ?? '');
  const targetDate = String(block.data.targetDate ?? '');
  const showDays = block.data.showDays !== false;
  const showHours = block.data.showHours !== false;
  const showMinutes = block.data.showMinutes !== false;

  const targetMs = useMemo(() => {
    const t = Date.parse(targetDate);
    return Number.isFinite(t) ? t : null;
  }, [targetDate]);

  const rem = useRemaining(isEditing ? null : targetMs);

  if (!isEditing) {
    return (
      <section className="my-8 rounded-2xl border-2 border-brand-blue/20 bg-brand-blue/5 px-6 py-8 text-center">
        {title ? <h3 className="text-lg font-black text-brand-blue">{title}</h3> : null}
        {rem && !rem.expired ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-brand-blue">
            {showDays ? (
              <div>
                <div className="text-3xl font-black tabular-nums">{rem.days}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Days</div>
              </div>
            ) : null}
            {showHours ? (
              <div>
                <div className="text-3xl font-black tabular-nums">{pad(rem.hours)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hours</div>
              </div>
            ) : null}
            {showMinutes ? (
              <div>
                <div className="text-3xl font-black tabular-nums">{pad(rem.mins)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Min</div>
              </div>
            ) : null}
            <div>
              <div className="text-3xl font-black tabular-nums">{pad(rem.secs)}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sec</div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm font-medium text-slate-600">
            {targetDate ? <time dateTime={targetDate}>{new Date(targetDate).toLocaleString()}</time> : 'Set a target date in the editor.'}
          </p>
        )}
        {rem?.expired ? <p className="mt-4 text-sm font-black uppercase tracking-widest text-brand-blue">We’re live</p> : null}
      </section>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <input
        value={title}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        placeholder="Heading (e.g. Event starts in)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black"
      />
      <label className="block text-[10px] font-black uppercase text-slate-400">
        Target (ISO 8601, e.g. 2026-08-15T18:00:00-04:00)
        <input
          value={targetDate}
          onChange={(e) => updateBlock(block.id, { targetDate: e.target.value })}
          placeholder="2026-12-31T23:59:59Z"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        />
      </label>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showDays} onChange={(e) => updateBlock(block.id, { showDays: e.target.checked })} />
          Days
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showHours} onChange={(e) => updateBlock(block.id, { showHours: e.target.checked })} />
          Hours
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showMinutes} onChange={(e) => updateBlock(block.id, { showMinutes: e.target.checked })} />
          Minutes
        </label>
      </div>
    </div>
  );
}
