import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export default function BlogInspectorSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80"
        aria-expanded={open}
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="space-y-3 border-t border-slate-100 px-3 py-3">{children}</div> : null}
    </section>
  );
}
