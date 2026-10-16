import type { CSSProperties } from 'react';

const SIZES = ['sm', 'md', 'lg'] as const;
export const BUTTON_STYLES = ['primary', 'secondary', 'ghost', 'outline', 'pill', 'dark'] as const;
export type ButtonStyleId = (typeof BUTTON_STYLES)[number];

export function buttonPadding(size: string): string {
  if (size === 'sm') return '8px 16px';
  if (size === 'lg') return '18px 40px';
  return '12px 22px';
}

export function buttonWidth(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'auto') return undefined;
  if (raw === 'full') return '100%';
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
}

export function buttonStyleId(value: unknown): ButtonStyleId {
  return BUTTON_STYLES.includes(String(value) as ButtonStyleId) ? (String(value) as ButtonStyleId) : 'primary';
}

export function buttonFaceClass(style: string, brandFace = false): string {
  const id = buttonStyleId(style);
  if (brandFace) return id === 'secondary' || id === 'ghost' || id === 'outline' ? 'vj-btn ghost' : 'vj-btn';
  const base =
    'inline-flex items-center justify-center font-black uppercase tracking-widest transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-blue';
  if (id === 'secondary') return `${base} rounded-xl border-2 border-brand-blue bg-white text-brand-blue hover:bg-slate-50`;
  if (id === 'ghost') return `${base} rounded-xl text-brand-blue underline-offset-4 hover:underline`;
  if (id === 'outline') return `${base} rounded-full border-2 border-slate-900 bg-transparent text-slate-900 hover:bg-slate-50`;
  if (id === 'pill') return `${base} rounded-full bg-brand-blue text-white shadow-md hover:brightness-105`;
  if (id === 'dark') return `${base} rounded-xl border border-white/20 bg-slate-900 text-white hover:bg-slate-800`;
  return `${base} rounded-xl bg-brand-blue text-brand-yellow shadow-md hover:brightness-105`;
}

export function buttonFaceStyle(data: Record<string, unknown>): CSSProperties {
  const size = SIZES.includes(String(data.size) as (typeof SIZES)[number]) ? String(data.size) : 'md';
  return {
    color: String(data.color ?? '').trim() || undefined,
    backgroundColor: String(data.backgroundColor ?? '').trim() || undefined,
    fontSize: String(data.fontSize ?? '').trim() ? `${String(data.fontSize).replace(/px$/, '')}px` : undefined,
    padding: buttonPadding(size),
    width: buttonWidth(data.buttonWidth),
    boxSizing: 'border-box',
    textAlign: 'center',
    justifyContent: 'center',
  };
}
