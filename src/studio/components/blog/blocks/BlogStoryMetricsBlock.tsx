import { Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { BLOG_BLOCK_DEFAULTS, type BlogBlock } from '../../../lib/blog/blogBlockTypes';
import {
  findStoryMetricsMergeStartIndex,
  mergeStoryMetricsBlocksAt,
  resolveStoryMetricsLayout,
} from '../../../lib/blog/blogStoryMetricsLayout';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';

type Accent = 'sky' | 'gold' | 'slate';
type Stat = { value: string; label: string; caption: string; accent: Accent };

const ACCENT_NUM: Record<Accent, string> = {
  sky: 'font-serif text-[clamp(1.75rem,4vw,2.35rem)] font-bold leading-none text-sky-300',
  gold: 'font-serif text-[clamp(1.75rem,4vw,2.35rem)] font-bold leading-none text-[#e8c547]',
  slate: 'font-serif text-[clamp(1.75rem,4vw,2.35rem)] font-bold leading-none text-slate-300',
};

function normalizeStats(raw: unknown): Stat[] {
  if (!Array.isArray(raw))
    return [{ value: '', label: '', caption: '', accent: 'sky' satisfies Accent }];
  return raw.map((row) => {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const ac = o.accent === 'gold' || o.accent === 'slate' ? o.accent : 'sky';
    return {
      value: String(o.value ?? ''),
      label: String(o.label ?? ''),
      caption: String(o.caption ?? ''),
      accent: ac as Accent,
    };
  });
}

function SpotlightPreview({
  spotlightYear,
  spotlightLead,
  spotlightBody,
}: {
  spotlightYear: string;
  spotlightLead: string;
  spotlightBody: string;
}) {
  if (!(spotlightYear || spotlightLead || spotlightBody).trim()) return null;
  return (
    <div className="border-b border-white/10 pb-8">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-8">
        {spotlightYear.trim() ? (
          <div className="font-serif text-[clamp(2rem,5vw,2.75rem)] font-bold leading-none text-sky-300">
            {spotlightYear.trim()}
          </div>
        ) : null}
        <div className="min-w-0">
          {spotlightLead.trim() ? (
            <p className="m-0 inline font-sans text-[15px] font-semibold text-sky-200">{spotlightLead.trim()} </p>
          ) : null}
          {spotlightBody.trim() ? (
            <p className="m-0 inline font-sans text-[15px] font-normal leading-relaxed text-slate-400">{spotlightBody.trim()}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatsPreview({ stats }: { stats: Stat[] }) {
  if (!stats.some((s) => s.value || s.label)) return null;
  return (
    <div className="grid gap-8 border-b border-white/10 py-10 sm:grid-cols-3 sm:gap-6">
      {stats.map((s, i) => (
        <div
          key={i}
          className={`text-center ${i > 0 ? 'border-t border-white/10 pt-8 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0' : ''}`}
        >
          <div className={ACCENT_NUM[s.accent]}>{s.value}</div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{s.label}</p>
          {s.caption ? <p className="mt-2 px-2 text-xs leading-relaxed text-slate-500">{s.caption}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ActionsPreview({
  actionsTitle,
  actions,
  insetBg,
  topSpacer,
}: {
  actionsTitle: string;
  actions: string[];
  insetBg: string;
  /** When false, omit top margin (e.g. actions-only segment). */
  topSpacer?: boolean;
}) {
  if (!actions.length) return null;
  const insetStyle = insetBg.trim() ? { backgroundColor: insetBg.trim() } : { backgroundColor: 'rgba(20, 24, 58, 0.9)' };
  return (
    <div className={`${topSpacer === false ? '' : 'mt-10 '}rounded-2xl border border-indigo-500/30 px-5 py-6 sm:px-8`} style={insetStyle}>
      <h3 className="font-serif text-lg font-semibold text-[#e8c547] sm:text-xl">{actionsTitle.trim()}</h3>
      <ul className="mt-5 list-none space-y-3 p-0 font-sans text-sm leading-relaxed text-slate-300">
        {actions.map((line, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="shrink-0 text-[#c9a227]" aria-hidden>
              →
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BlogStoryMetricsBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const replaceBlockWithMany = useBlogEditorStore((s) => s.replaceBlockWithMany);
  const blocks = useBlogEditorStore((s) => s.blocks);
  const setBlocks = useBlogEditorStore((s) => s.setBlocks);
  const selectBlock = useBlogEditorStore((s) => s.selectBlock);

  const layout = resolveStoryMetricsLayout(block.data);
  const shellBg = String(block.data.shellBg ?? '');
  const insetBg = String(block.data.insetBg ?? '');
  const spotlightYear = String(block.data.spotlightYear ?? '');
  const spotlightLead = String(block.data.spotlightLead ?? '');
  const spotlightBody = String(block.data.spotlightBody ?? '');
  const actionsTitle = String(block.data.actionsTitle ?? 'What you can do right now.');
  const stats = normalizeStats(block.data.stats);
  const actionsRaw = block.data.actions;
  const actions = Array.isArray(actionsRaw) ? actionsRaw.map((a) => String(a ?? '')).filter(Boolean) : [];

  const setStats = (next: Stat[]) => updateBlock(block.id, { stats: next });
  const setActions = (next: string[]) => updateBlock(block.id, { actions: next });

  const shellStyle = shellBg.trim() ? { backgroundColor: shellBg.trim() } : undefined;
  const shellClassName =
    'blog-story-metrics not-prose my-10 max-w-3xl overflow-hidden rounded-2xl border border-white/10 px-6 py-10 shadow-xl sm:px-10' +
    (shellBg.trim() ? '' : ' bg-[#080f26]');

  const splitIntoThree = () => {
    if (layout !== 'full') return;
    const base = BLOG_BLOCK_DEFAULTS.story_metrics as Record<string, unknown>;
    const shell = shellBg.trim();
    const inset = insetBg.trim();
    const nextBlocks: BlogBlock[] = [
      {
        id: nanoid(),
        type: 'story_metrics',
        data: {
          ...base,
          layout: 'spotlight',
          shellBg: shell,
          insetBg: '',
          spotlightYear,
          spotlightLead,
          spotlightBody,
          stats: [],
          actions: [],
          actionsTitle: '',
        },
      },
      {
        id: nanoid(),
        type: 'story_metrics',
        data: {
          ...base,
          layout: 'stats',
          shellBg: shell,
          insetBg: '',
          spotlightYear: '',
          spotlightLead: '',
          spotlightBody: '',
          stats: stats.map((s) => ({ ...s })),
          actions: [],
          actionsTitle: '',
        },
      },
      {
        id: nanoid(),
        type: 'story_metrics',
        data: {
          ...base,
          layout: 'actions',
          shellBg: shell,
          insetBg: inset || base.insetBg,
          spotlightYear: '',
          spotlightLead: '',
          spotlightBody: '',
          stats: [],
          actions: [...actions],
          actionsTitle,
        },
      },
    ];
    replaceBlockWithMany(block.id, nextBlocks);
  };

  const mergeStartIndex = layout !== 'full' ? findStoryMetricsMergeStartIndex(blocks, block.id) : null;

  const mergeIntoOneStrip = () => {
    if (mergeStartIndex == null) return;
    const next = mergeStoryMetricsBlocksAt(blocks, mergeStartIndex);
    if (!next) return;
    setBlocks(next);
    const merged = next[mergeStartIndex];
    if (merged) selectBlock(merged.id);
  };

  if (!isEditing) {
    const inner = (
      <>
        {(layout === 'full' || layout === 'spotlight') && (
          <SpotlightPreview spotlightYear={spotlightYear} spotlightLead={spotlightLead} spotlightBody={spotlightBody} />
        )}
        {(layout === 'full' || layout === 'stats') && <StatsPreview stats={stats} />}
        {(layout === 'full' || layout === 'actions') && (
          <ActionsPreview
            actionsTitle={actionsTitle}
            actions={actions}
            insetBg={insetBg}
            topSpacer={layout === 'full'}
          />
        )}
      </>
    );

    const showSection =
      layout === 'full' ||
      (layout === 'spotlight' && (spotlightYear || spotlightLead || spotlightBody).trim()) ||
      (layout === 'stats' && stats.some((s) => s.value || s.label)) ||
      (layout === 'actions' && actions.length > 0);

    if (!showSection) return null;

    return (
      <section className={shellClassName} style={shellStyle}>
        {inner}
      </section>
    );
  }

  const layoutHint =
    layout === 'full'
      ? 'Dark infographic strip: spotlight row → three metrics → checklist. Matches Timeline (Story dark).'
      : layout === 'spotlight'
        ? 'Spotlight segment (split strip). Reorder this block independently.'
        : layout === 'stats'
          ? 'Metrics segment (split strip).'
          : 'Actions / CTA segment (split strip).';

  const colorFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Shell background</label>
        <input
          value={shellBg}
          onChange={(e) => updateBlock(block.id, { shellBg: e.target.value })}
          placeholder="#080f26 or rgb(8,15,38)"
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
        />
        <p className="mt-0.5 text-[10px] text-slate-400">Leave empty for default navy.</p>
      </div>
      {(layout === 'full' || layout === 'actions') ? (
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Actions panel background</label>
          <input
            value={insetBg}
            onChange={(e) => updateBlock(block.id, { insetBg: e.target.value })}
            placeholder="Optional hex / rgb"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
          />
          <p className="mt-0.5 text-[10px] text-slate-400">Used for the checklist inset (full strip or actions-only).</p>
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-xl text-xs font-medium text-slate-500">{layoutHint}</p>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {layout === 'full' ? (
            <button
              type="button"
              onClick={splitIntoThree}
              className="rounded-lg border border-brand-blue/30 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-blue shadow-sm hover:bg-brand-blue/5"
            >
              Split into 3 blocks
            </button>
          ) : null}
          {mergeStartIndex != null ? (
            <button
              type="button"
              onClick={mergeIntoOneStrip}
              className="rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-900 shadow-sm hover:bg-emerald-100"
            >
              Merge into one strip
            </button>
          ) : null}
        </div>
      </div>

      {colorFields}

      {(layout === 'full' || layout === 'spotlight') && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Spotlight year</label>
              <input
                value={spotlightYear}
                onChange={(e) => updateBlock(block.id, { spotlightYear: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Lead clause (accent)</label>
              <input
                value={spotlightLead}
                onChange={(e) => updateBlock(block.id, { spotlightLead: e.target.value })}
                placeholder='e.g. "Callais v. Louisiana."'
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Supporting paragraph</label>
            <textarea
              value={spotlightBody}
              onChange={(e) => updateBlock(block.id, { spotlightBody: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {(layout === 'full' || layout === 'stats') && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Three metrics</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2 py-1 text-[11px] font-semibold text-brand-yellow"
              onClick={() => setStats([...stats, { value: '', label: '', caption: '', accent: 'sky' }])}
            >
              <Plus size={12} /> Column
            </button>
          </div>
          <div className="space-y-3">
            {stats.map((row, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex justify-end">
                  {stats.length > 1 ? (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => setStats(stats.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['sky', 'gold', 'slate'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        const c = [...stats];
                        c[idx] = { ...c[idx], accent: a };
                        setStats(c);
                      }}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        row.accent === a ? 'bg-brand-blue text-brand-yellow' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <input
                  value={row.value}
                  placeholder="6.7%"
                  className="w-full rounded border border-slate-200 px-2 py-1.5 font-mono text-sm"
                  onChange={(e) => {
                    const c = [...stats];
                    c[idx] = { ...c[idx], value: e.target.value };
                    setStats(c);
                  }}
                />
                <input
                  value={row.label}
                  placeholder="LABEL"
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold uppercase"
                  onChange={(e) => {
                    const c = [...stats];
                    c[idx] = { ...c[idx], label: e.target.value };
                    setStats(c);
                  }}
                />
                <textarea
                  value={row.caption}
                  placeholder="Smaller caption"
                  rows={2}
                  className="w-full resize-none rounded border border-slate-200 px-2 py-1.5 text-xs"
                  onChange={(e) => {
                    const c = [...stats];
                    c[idx] = { ...c[idx], caption: e.target.value };
                    setStats(c);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {(layout === 'full' || layout === 'actions') && (
        <>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Actions box title</label>
            <input
              value={actionsTitle}
              onChange={(e) => updateBlock(block.id, { actionsTitle: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Bullets (→ arrows on front end)</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2 py-1 text-[11px] font-semibold text-brand-yellow"
                onClick={() => setActions([...actions, ''])}
              >
                <Plus size={12} /> Line
              </button>
            </div>
            <div className="space-y-2">
              {actions.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={line}
                    onChange={(e) => {
                      const copy = [...actions];
                      copy[idx] = e.target.value;
                      setActions(copy);
                    }}
                    placeholder="Action item…"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {layout !== 'full' ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
          {mergeStartIndex != null ? (
            <>
              Three adjacent segments (spotlight, metrics, actions) can be merged with the button above. You can also remove
              these blocks and add a new <strong>Story stats / CTA</strong> from the picker.
            </>
          ) : (
            <>
              This segment is split from a combined strip. Place the three segments next to each other (spotlight, metrics,
              actions) to enable <strong>Merge into one strip</strong>, or remove them and add a new <strong>Story stats / CTA</strong>{' '}
              block from the picker.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
