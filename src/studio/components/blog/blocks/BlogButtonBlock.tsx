import type { CSSProperties } from 'react';
import { safeHref } from '../../../lib/blog/safeHref';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import '../../../../brand/brand.css';

const sizes = ['sm', 'md', 'lg'] as const;

function btnClass(style: string): string {
  const base =
    'inline-flex items-center justify-center rounded-xl font-black uppercase tracking-widest transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-brand-blue';
  if (style === 'secondary') return `${base} border-2 border-brand-blue bg-white text-brand-blue hover:bg-slate-50`;
  if (style === 'ghost') return `${base} text-brand-blue underline-offset-4 hover:underline`;
  return `${base} bg-brand-blue text-brand-yellow shadow-md hover:brightness-105`;
}

function buttonPadding(size: string): string {
  if (size === 'sm') return '8px 16px';
  if (size === 'lg') return '18px 40px';
  return '12px 22px';
}

function buttonWidth(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'auto') return undefined;
  if (raw === 'full') return '100%';
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
}

export default function BlogButtonBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const text = String(block.data.text ?? 'Click here');
  const url = String(block.data.url ?? '#');
  const href = safeHref(url) ?? '#';
  const style = String(block.data.style ?? 'primary');
  const align = String(block.data.align ?? 'left');
  const size = sizes.includes(String(block.data.size) as (typeof sizes)[number]) ? String(block.data.size) : 'md';
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const width = buttonWidth(block.data.buttonWidth);
  const face: CSSProperties = {
    color: String(block.data.color ?? '').trim() || undefined,
    backgroundColor: String(block.data.backgroundColor ?? '').trim() || undefined,
    fontSize: String(block.data.fontSize ?? '').trim() ? `${String(block.data.fontSize).replace(/px$/, '')}px` : undefined,
    padding: buttonPadding(size),
    width,
    boxSizing: 'border-box',
    textAlign: 'center',
    justifyContent: 'center',
  };
  const ghost = style === 'secondary' || style === 'ghost';
  const className = block.data.brandFace ? (ghost ? 'vj-btn ghost' : 'vj-btn') : btnClass(style);
  const label = text || 'Button';
  const button = isEditing ? (
    <span className={className} style={face}>
      {label}
    </span>
  ) : (
    <a href={href} className={className} style={face} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {label}
    </a>
  );

  return <div className={`my-3 flex w-full ${justify}`}>{button}</div>;
}
