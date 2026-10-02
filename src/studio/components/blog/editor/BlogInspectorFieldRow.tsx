import type { ReactNode } from 'react';
import { Monitor } from 'lucide-react';

/** Elementor-style label row: control name on the left, inputs on the right. */
export function BlogInspectorFieldRow({
  label,
  children,
  responsive,
}: {
  label: string;
  children: ReactNode;
  responsive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-1.5">
        {responsive ? <Monitor className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden /> : null}
        <span className="text-xs text-slate-700">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

export function BlogInspectorIconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded border text-slate-600 transition hover:border-brand-blue/40 hover:text-brand-blue ${
        active ? 'border-brand-blue/50 bg-brand-blue/5 text-brand-blue' : 'border-slate-200 bg-white'
      }`}
    >
      {children}
    </button>
  );
}
