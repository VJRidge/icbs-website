import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type BlogLightboxImage = { url: string; alt?: string; caption?: string };

export default function BlogImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: BlogLightboxImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => setIdx(initialIndex), [initialIndex]);

  const len = images.length;
  const cur = len ? images[Math.min(Math.max(idx, 0), len - 1)] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && len > 1) setIdx((i) => (i + 1) % len);
      if (e.key === 'ArrowLeft' && len > 1) setIdx((i) => (i - 1 + len) % len);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [len, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!len || !cur?.url?.trim()) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {len > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + len) % len);
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % len);
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:right-6"
            aria-label="Next image"
          >
            <ChevronRight size={28} />
          </button>
        </>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6 pt-14"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={cur.url}
          alt={cur.alt ?? ''}
          className="max-h-[min(85vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />
        {cur.caption?.trim() ? (
          <p className="mt-4 max-w-2xl text-center text-sm text-white/90">{cur.caption}</p>
        ) : null}
        {len > 1 ? (
          <p className="mt-3 text-xs text-white/60">
            {idx + 1} / {len}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
