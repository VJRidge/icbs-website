import type { ColumnLayoutKey } from './blogBlockTypes';
import type { BlogBlock } from './blogBlockTypes';

export type ColumnZone = { blocks: BlogBlock[] };

export const COLUMN_LAYOUT_META: Record<
  ColumnLayoutKey,
  { label: string; count: number; grid: string }
> = {
  '100': { label: 'Full width', count: 1, grid: '1fr' },
  '50-50': { label: '2 equal', count: 2, grid: '1fr 1fr' },
  '33-33-33': { label: '3 equal', count: 3, grid: '1fr 1fr 1fr' },
  '25-25-25-25': { label: '4 equal', count: 4, grid: '1fr 1fr 1fr 1fr' },
  '66-33': { label: '2/3 + 1/3', count: 2, grid: '2fr 1fr' },
  '33-66': { label: '1/3 + 2/3', count: 2, grid: '1fr 2fr' },
};

export function columnCountForLayout(layout: string): number {
  const meta = COLUMN_LAYOUT_META[layout as ColumnLayoutKey];
  return meta?.count ?? 2;
}

export function gridTemplateForLayout(layout: string): string {
  return gridTemplateFromWidths(defaultWidthsForLayout(layout));
}

export function defaultWidthsForLayout(layout: string): number[] {
  switch (layout as ColumnLayoutKey) {
    case '100':
      return [100];
    case '33-33-33':
      return [34, 33, 33];
    case '25-25-25-25':
      return [25, 25, 25, 25];
    case '66-33':
      return [66, 34];
    case '33-66':
      return [34, 66];
    case '50-50':
    default:
      return [50, 50];
  }
}

const MIN_COL_WEIGHT = 12;
const MAX_COL_WEIGHT = 88;

/** Normalize stored widths to match column count; fall back to layout presets. */
export function normalizeColumnWidths(layout: string, raw: unknown): number[] {
  const count = columnCountForLayout(layout);
  const defaults = defaultWidthsForLayout(layout);
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const parsed = raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  if (parsed.length !== count) return defaults;
  const sum = parsed.reduce((a, b) => a + b, 0);
  if (sum <= 0) return defaults;
  return parsed.map((n) => Math.round((n / sum) * 1000) / 10);
}

export function gridTemplateFromWidths(widths: number[]): string {
  return widths.map((w) => `${Math.max(1, w)}fr`).join(' ');
}

/** Shift weight between column `index` and `index + 1` by `delta` (flex-weight units). */
export function adjustAdjacentColumnWidths(widths: number[], index: number, delta: number): number[] {
  if (index < 0 || index >= widths.length - 1) return widths;
  const next = [...widths];
  let left = next[index]! + delta;
  let right = next[index + 1]! - delta;
  if (left < MIN_COL_WEIGHT) {
    right -= MIN_COL_WEIGHT - left;
    left = MIN_COL_WEIGHT;
  }
  if (right < MIN_COL_WEIGHT) {
    left -= MIN_COL_WEIGHT - right;
    right = MIN_COL_WEIGHT;
  }
  if (left > MAX_COL_WEIGHT) {
    right += left - MAX_COL_WEIGHT;
    left = MAX_COL_WEIGHT;
  }
  if (right > MAX_COL_WEIGHT) {
    left += right - MAX_COL_WEIGHT;
    right = MAX_COL_WEIGHT;
  }
  next[index] = Math.round(left * 10) / 10;
  next[index + 1] = Math.round(right * 10) / 10;
  return next;
}

export function normalizeColumnZones(raw: unknown, layout: string): ColumnZone[] {
  const count = columnCountForLayout(layout);
  const fromData = Array.isArray(raw) ? raw : [];
  const zones: ColumnZone[] = [];
  for (let i = 0; i < count; i++) {
    const row = fromData[i];
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const blocksRaw = Array.isArray(o.blocks) ? o.blocks : [];
    zones.push({ blocks: blocksRaw as BlogBlock[] });
  }
  return zones;
}

export function resizeColumnZones(zones: ColumnZone[], layout: ColumnLayoutKey): ColumnZone[] {
  const count = columnCountForLayout(layout);
  const next: ColumnZone[] = [];
  for (let i = 0; i < count; i++) {
    next.push(zones[i] ?? { blocks: [] });
  }
  return next;
}
