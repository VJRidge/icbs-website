import type { CSSProperties } from 'react';

function blogDataNum(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = Number(data[key]);
  return Number.isFinite(v) ? v : fallback;
}

export type BlogTextShadow = {
  horizontal?: number;
  vertical?: number;
  blur?: number;
  color?: string;
};

export function parseTextShadow(data: Record<string, unknown>): BlogTextShadow {
  const raw = data.textShadow;
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  return {
    horizontal: Number.isFinite(Number(o.horizontal)) ? Number(o.horizontal) : 0,
    vertical: Number.isFinite(Number(o.vertical)) ? Number(o.vertical) : 0,
    blur: Number.isFinite(Number(o.blur)) ? Number(o.blur) : 0,
    color: typeof o.color === 'string' ? o.color : 'rgba(0,0,0,0.25)',
  };
}

export function textShadowToCss(shadow: BlogTextShadow): string | undefined {
  const blur = shadow.blur ?? 0;
  const h = shadow.horizontal ?? 0;
  const v = shadow.vertical ?? 0;
  if (!blur && !h && !v) return undefined;
  return `${h}px ${v}px ${blur}px ${shadow.color ?? 'rgba(0,0,0,0.25)'}`;
}

export function paragraphBlockWrapperStyle(data: Record<string, unknown>): CSSProperties {
  const mt = blogDataNum(data, 'marginTop', 0);
  const mb = blogDataNum(data, 'marginBottom', 0);
  const spacing = blogDataNum(data, 'paragraphSpacing', 0);
  const textColor = String(data.textColor ?? '').trim();
  const linkColor = String(data.linkColor ?? '').trim();
  const hoverText = String(data.hoverTextColor ?? '').trim();
  const hoverLink = String(data.hoverLinkColor ?? '').trim();
  const align = String(data.align ?? '').trim();
  const shadowCss = textShadowToCss(parseTextShadow(data));

  const style: CSSProperties & Record<string, string | undefined> = {
    marginTop: mt ? `${mt}px` : undefined,
    marginBottom: mb ? `${mb}px` : undefined,
    textAlign: align === 'left' || align === 'center' || align === 'right' || align === 'justify' ? align : undefined,
    color: textColor || undefined,
    textShadow: shadowCss,
  };

  if (spacing > 0) style['--blog-p-spacing'] = `${spacing}px`;
  if (linkColor) style['--blog-link-color'] = linkColor;
  if (hoverText) style['--blog-hover-text'] = hoverText;
  if (hoverLink) style['--blog-hover-link'] = hoverLink;

  return style;
}

export function paragraphBlockWrapperClass(data: Record<string, unknown>): string {
  const custom = String(data.customClass ?? '').trim();
  return ['blog-paragraph-block', custom].filter(Boolean).join(' ');
}
