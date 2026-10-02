import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '../../../lib/utils';
import BlogPageStructurePanel from './BlogPageStructurePanel';

/** Icon control in the CMS top bar — opens the block reorder panel on click. */
export default function BlogPageStructureHeaderControl({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Page structure — drag blocks to reorder"
        aria-label="Page structure"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
          open
            ? 'border-brand-yellow/60 bg-white/15 text-brand-yellow'
            : 'border-white/25 text-white/90 hover:border-white/40 hover:text-white',
        )}
      >
        <LayoutGrid size={15} strokeWidth={2} />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Page structure"
          className="absolute right-0 top-full z-[80] mt-1.5 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
        >
          <p className="border-b border-slate-100 px-3 py-2 text-[10px] leading-snug text-slate-500">
            Drag blocks by the grip · use arrows inside columns · click a row to select
          </p>
          <BlogPageStructurePanel compact hideHeader />
        </div>
      ) : null}
    </div>
  );
}
