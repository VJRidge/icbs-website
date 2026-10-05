import { useMemo } from 'react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import CarouselStage from './CarouselStage';

type Item = { url: string; alt: string; caption: string; videoUrl?: string };

function normalizeItems(block: BlogBlock): Item[] {
  const raw = Array.isArray(block.data.items) ? block.data.items : [];
  return raw.map((row: unknown) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    return {
      url: String(item.url ?? ''),
      alt: String(item.alt ?? ''),
      caption: String(item.caption ?? ''),
      videoUrl: typeof item.videoUrl === 'string' ? item.videoUrl : undefined,
    };
  });
}

export default function BlogCarouselBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const items = useMemo(() => normalizeItems(block), [block]);
  const useStage = isEditing || Boolean(block.data.kind) || Boolean(block.data.skin);
  if (useStage) return <CarouselStage block={block} isEditing={isEditing} />;

  const peekPx = Math.min(120, Math.max(0, Number(block.data.peekPx) || 32));
  const snap = block.data.snap !== false;
  const visible = items.filter((item) => item.url.trim() || item.videoUrl?.trim());
  if (!visible.length) return null;

  return (
    <section className="my-6">
      <div
        className={`flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] ${snap ? 'snap-x snap-mandatory' : ''}`}
        style={{ paddingLeft: peekPx, paddingRight: peekPx }}
        aria-label="Carousel"
      >
        {visible.map((item, index) => (
          <figure
            key={`car-${index}-${item.url || item.videoUrl}`}
            className={`w-[min(100vw-4rem,520px)] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md ${snap ? 'snap-center' : ''}`}
          >
            {item.videoUrl?.trim() ? (
              <div className="aspect-video w-full bg-black">
                <iframe src={item.videoUrl.trim()} title={item.alt || 'Embedded video'} className="h-full w-full" loading="lazy" allowFullScreen />
              </div>
            ) : (
              <img src={item.url} alt={item.alt} className="aspect-video w-full object-cover" referrerPolicy="no-referrer" loading={index > 0 ? 'lazy' : 'eager'} />
            )}
            {item.caption?.trim() ? <figcaption className="px-4 py-3 text-center text-sm text-slate-600">{item.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
