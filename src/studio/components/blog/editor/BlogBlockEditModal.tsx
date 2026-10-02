import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { BLOG_BLOCK_LABELS } from '../../../lib/blog/blogBlockTypes';
import BlogBlockRenderer from '../BlogBlockRenderer';

type Props = {
  block: BlogBlock;
  onClose: () => void;
};

export default function BlogBlockEditModal({ block, onClose }: Props) {
  const label = BLOG_BLOCK_LABELS[block.type as keyof typeof BLOG_BLOCK_LABELS] ?? block.type;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blog-block-edit-title"
        className="relative flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="blog-block-edit-title" className="text-base font-bold text-slate-900">
              Edit {label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Changes save automatically as you edit.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <BlogBlockRenderer block={block} isEditing />
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-blue px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:opacity-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
