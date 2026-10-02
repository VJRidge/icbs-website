import { nanoid } from 'nanoid';
import { BLOG_BLOCK_DEFAULTS, type BlogBlock } from './blogBlockTypes';

export type StoryMetricsLayout = 'full' | 'spotlight' | 'stats' | 'actions';

export function resolveStoryMetricsLayout(data: Record<string, unknown>): StoryMetricsLayout {
  const raw = String(data.layout ?? 'full');
  if (raw === 'spotlight' || raw === 'stats' || raw === 'actions') return raw;
  return 'full';
}

/** Three consecutive `story_metrics` blocks with one spotlight, one stats, and one actions segment (any order). */
export function findStoryMetricsMergeStartIndex(blocks: BlogBlock[], blockId: string): number | null {
  for (let i = 0; i <= blocks.length - 3; i++) {
    const slice = blocks.slice(i, i + 3);
    if (!slice.every((b) => b.type === 'story_metrics')) continue;
    const layouts = slice.map((b) => resolveStoryMetricsLayout(b.data));
    const set = new Set(layouts);
    if (set.size !== 3 || !set.has('spotlight') || !set.has('stats') || !set.has('actions')) continue;
    if (slice.some((b) => b.id === blockId)) return i;
  }
  return null;
}

function normalizeStatsFromData(data: Record<string, unknown>): unknown[] {
  const raw = data.stats;
  return Array.isArray(raw) ? raw : [];
}

function normalizeActionsFromData(data: Record<string, unknown>): string[] {
  const raw = data.actions;
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => String(a ?? '')).filter(Boolean);
}

/** Replace three segment blocks at `startIndex` with one `layout: 'full'` block. */
export function mergeStoryMetricsBlocksAt(blocks: BlogBlock[], startIndex: number): BlogBlock[] | null {
  if (startIndex < 0 || startIndex > blocks.length - 3) return null;
  const slice = blocks.slice(startIndex, startIndex + 3);
  if (!slice.every((b) => b.type === 'story_metrics')) return null;
  const spotlight = slice.find((b) => resolveStoryMetricsLayout(b.data) === 'spotlight');
  const statsB = slice.find((b) => resolveStoryMetricsLayout(b.data) === 'stats');
  const actionsB = slice.find((b) => resolveStoryMetricsLayout(b.data) === 'actions');
  if (!spotlight || !statsB || !actionsB) return null;

  const shellBg =
    [String(spotlight.data.shellBg ?? '').trim(), String(statsB.data.shellBg ?? '').trim(), String(actionsB.data.shellBg ?? '').trim()].find(
      Boolean,
    ) ?? '';
  const insetBg = String(actionsB.data.insetBg ?? '').trim();

  const merged: BlogBlock = {
    id: nanoid(),
    type: 'story_metrics',
    data: {
      ...(BLOG_BLOCK_DEFAULTS.story_metrics as Record<string, unknown>),
      layout: 'full',
      shellBg,
      insetBg,
      spotlightYear: spotlight.data.spotlightYear,
      spotlightLead: spotlight.data.spotlightLead,
      spotlightBody: spotlight.data.spotlightBody,
      stats: normalizeStatsFromData(statsB.data),
      actionsTitle: actionsB.data.actionsTitle,
      actions: normalizeActionsFromData(actionsB.data),
    },
  };

  return [...blocks.slice(0, startIndex), merged, ...blocks.slice(startIndex + 3)];
}
