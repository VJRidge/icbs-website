import type { ColumnLayoutKey } from './blogBlockTypes';
import type { BlogBlock } from './blogBlockTypes';

export type ColumnZone = { blocks: BlogBlock[] };

export const COLUMN_LAYOUT_META: Record<
  ColumnLayoutKey,
  { label: string; count: number; grid: string }
> = {
  '100': { label: '1 column', count: 1, grid: '1fr' },
  '50-50': { label: '2 columns', count: 2, grid: '1fr 1fr' },
  '33-33-33': { label: '3 columns', count: 3, grid: '1fr 1fr 1fr' },
  '25-25-25-25': { label: '4 columns', count: 4, grid: '1fr 1fr 1fr 1fr' },
  '66-33': { label: 'Wide + narrow', count: 2, grid: '2fr 1fr' },
  '33-66': { label: 'Narrow + wide', count: 2, grid: '1fr 2fr' },
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

/** Same band the brand column drag uses, so a typed width cannot pass the handle. */
export const COLUMN_WIDTH_MIN = 12;
export const COLUMN_WIDTH_MAX = 76;

const LAYOUT_FOR_COUNT: Record<number, ColumnLayoutKey> = {
  1: '100',
  2: '50-50',
  3: '33-33-33',
  4: '25-25-25-25',
};

/** Use the saved layout when it has this many columns; otherwise the even preset for that count. */
export function layoutForColumnCount(layout: string, count: number): string {
  if (columnCountForLayout(layout) === count && count >= 1) return layout;
  return LAYOUT_FOR_COUNT[count] ?? layout;
}

function nearlyEqualWidths(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => Math.abs(n - (b[i] ?? 0)) < 0.11);
}

/**
 * Fractions written by a column drag.
 * Untouched layout presets, and the 2-column block default of 50/50 on any other layout,
 * return null so a designed grid keeps its CSS until someone actually resizes it.
 */
export function resizedColumnWidths(layout: string, raw: unknown): number[] | null {
  const count = columnCountForLayout(layout);
  if (!Array.isArray(raw) || raw.length !== count) return null;
  const widths = normalizeColumnWidths(layout, raw);
  const preset = defaultWidthsForLayout(layout);
  if (nearlyEqualWidths(widths, preset)) return null;
  const blockDefault = count === 2 ? [50, 50] : null;
  if (blockDefault && nearlyEqualWidths(widths, blockDefault) && !nearlyEqualWidths(preset, blockDefault)) return null;
  return widths;
}

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

function roundWidth(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Set one column to `percent` and share the remainder across the others.
 * Rejects values outside the drag band, or a share that would push another column outside it.
 */
export function widthsWithColumnPercent(widths: number[], index: number, percent: number): number[] | null {
  const count = widths.length;
  if (count < 2 || index < 0 || index >= count || !Number.isFinite(percent)) return null;
  const target = roundWidth(percent);
  if (target < COLUMN_WIDTH_MIN || target > COLUMN_WIDTH_MAX) return null;
  const others = count - 1;
  const remainder = roundWidth(100 - target);
  if (remainder < others * COLUMN_WIDTH_MIN - 0.001 || remainder > others * COLUMN_WIDTH_MAX + 0.001) return null;
  const base = widths.map((width, i) => (i === index ? 0 : Math.max(0, Number(width) || 0)));
  const baseSum = base.reduce((sum, n) => sum + n, 0);
  const next = widths.map((width, i) => {
    if (i === index) return target;
    const share = baseSum > 0 ? (Math.max(0, Number(width) || 0) / baseSum) : 1 / others;
    return roundWidth(remainder * share);
  });
  let drift = roundWidth(100 - next.reduce((sum, n) => sum + n, 0));
  if (drift !== 0) {
    for (let i = count - 1; i >= 0 && drift !== 0; i -= 1) {
      if (i === index) continue;
      const adjusted = roundWidth((next[i] ?? 0) + drift);
      if (adjusted < COLUMN_WIDTH_MIN || adjusted > COLUMN_WIDTH_MAX) continue;
      next[i] = adjusted;
      drift = 0;
    }
  }
  if (drift !== 0) return null;
  if (next.some((n, i) => i !== index && (n < COLUMN_WIDTH_MIN || n > COLUMN_WIDTH_MAX))) return null;
  if (Math.abs(next.reduce((sum, n) => sum + n, 0) - 100) > 0.11) return null;
  return next;
}

/** Shift weight between column `index` and `index + 1` by `delta` (flex-weight units). */
export function adjustAdjacentColumnWidths(
  widths: number[],
  index: number,
  delta: number,
  limits?: { min?: number; max?: number },
): number[] {
  if (index < 0 || index >= widths.length - 1) return widths;
  const min = limits?.min ?? MIN_COL_WEIGHT;
  const max = limits?.max ?? MAX_COL_WEIGHT;
  const next = [...widths];
  let left = next[index]! + delta;
  let right = next[index + 1]! - delta;
  if (left < min) {
    right -= min - left;
    left = min;
  }
  if (right < min) {
    left -= min - right;
    right = min;
  }
  if (left > max) {
    right += left - max;
    left = max;
  }
  if (right > max) {
    left += right - max;
    right = max;
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
