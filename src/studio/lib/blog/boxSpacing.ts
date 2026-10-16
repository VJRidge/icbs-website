export type BoxSides = { top: number; right: number; bottom: number; left: number };

const EMPTY: BoxSides = { top: 0, right: 0, bottom: 0, left: 0 };

export function finiteSpace(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function firstSide(data: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (!(key in data)) continue;
    const n = finiteSpace(data[key]);
    if (n != null) return Math.round(n);
  }
  return 0;
}

export function readMarginBox(data: Record<string, unknown>): BoxSides {
  return {
    top: firstSide(data, ['marginTop']),
    right: firstSide(data, ['marginRight']),
    bottom: firstSide(data, ['marginBottom']),
    left: firstSide(data, ['marginLeft']),
  };
}

export function readPaddingBox(data: Record<string, unknown>): BoxSides {
  return {
    top: firstSide(data, ['paddingTop', 'padTop', 'paddingY']),
    right: firstSide(data, ['paddingRight', 'padRight']),
    bottom: firstSide(data, ['paddingBottom', 'padBottom', 'paddingY']),
    left: firstSide(data, ['paddingLeft', 'padLeft']),
  };
}

export function spacingBoxStyle(data: Record<string, unknown>): {
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
} {
  const margin = readMarginBox(data);
  const padding = readPaddingBox(data);
  const style: ReturnType<typeof spacingBoxStyle> = {};
  if (margin.top) style.marginTop = margin.top;
  if (margin.right) style.marginRight = margin.right;
  if (margin.bottom) style.marginBottom = margin.bottom;
  if (margin.left) style.marginLeft = margin.left;
  if (padding.top) style.paddingTop = padding.top;
  if (padding.right) style.paddingRight = padding.right;
  if (padding.bottom) style.paddingBottom = padding.bottom;
  if (padding.left) style.paddingLeft = padding.left;
  return style;
}

export function emptyBoxSides(): BoxSides {
  return { ...EMPTY };
}
