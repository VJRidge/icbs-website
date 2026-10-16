import { useEffect, useId, useState } from 'react';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { accordionRowNumber, readAccordionColors, readAccordionItems } from '../../../lib/blog/accordionItems';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';
import { hasSurfaceLayers, readSurfaceBackground, surfaceShellStyle } from '../../../lib/blog/surfaceBackground';
import SurfaceBackgroundLayers from '../SurfaceBackgroundLayers';

export default function BlogAccordionBlock({ block }: { block: BlogBlock; isEditing: boolean }) {
  const items = readAccordionItems(block.data as Record<string, unknown>);
  const heading = String(block.data.heading ?? '').trim();
  const allowMultiple = block.data.allowMultiple !== false;
  const uid = useId();
  const firstOpen = items.findIndex((item) => item.open);
  const [openSet, setOpenSet] = useState<Set<number>>(() => {
    if (allowMultiple) return new Set(items.flatMap((item, i) => (item.open ? [i] : [])));
    return new Set(firstOpen >= 0 ? [firstOpen] : []);
  });

  useEffect(() => {
    if (allowMultiple) {
      setOpenSet(new Set(items.flatMap((item, i) => (item.open ? [i] : []))));
      return;
    }
    const next = items.findIndex((item) => item.open);
    setOpenSet(new Set(next >= 0 ? [next] : []));
  }, [allowMultiple, items.map((item) => `${item.title}:${item.open}`).join('|')]);

  const toggle = (index: number) => {
    setOpenSet((current) => {
      const isOpen = current.has(index);
      if (allowMultiple) {
        const next = new Set(current);
        if (isOpen) next.delete(index);
        else next.add(index);
        return next;
      }
      return isOpen ? new Set() : new Set([index]);
    });
  };

  const bg = readSurfaceBackground(block.data as Record<string, unknown>);
  const colors = readAccordionColors(block.data as Record<string, unknown>);
  const shell = {
    ...surfaceShellStyle(bg),
    backgroundColor: bg.color || String(block.data.backgroundColor || '#f3f1e6'),
    marginTop: Number(block.data.marginTop) || undefined,
    marginBottom: Number(block.data.marginBottom) || undefined,
    ['--how-yellow' as string]: colors.toggleColor,
    ['--how-ink' as string]: colors.toggleTextColor,
    ['--how-sage' as string]: colors.chipColor,
    ['--how-chip-text' as string]: colors.chipTextColor,
  };

  return (
    <section className={`blog-how-ai${hasSurfaceLayers(bg) ? ' vj-surface' : ''}`} style={shell} aria-label={heading || 'Accordion'}>
      <SurfaceBackgroundLayers bg={bg} />
      <div className="blog-how-ai-inner">
        {heading ? <h2 className="blog-how-ai-heading">{heading}</h2> : null}
        <div className="blog-how-ai-list">
          {items.map((item, index) => {
            const open = openSet.has(index);
            const headerId = `${uid}-h-${index}`;
            const panelId = `${uid}-p-${index}`;
            return (
              <div key={`${item.title}-${index}`} className={`blog-how-ai-row${open ? ' is-open' : ''}`}>
                <button
                  type="button"
                  id={headerId}
                  className="blog-how-ai-header"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(index);
                  }}
                >
                  <span className="blog-how-ai-num">{accordionRowNumber(index)}</span>
                  <span className="blog-how-ai-title">{item.title}</span>
                  <span className="blog-how-ai-toggle" aria-hidden>
                    {open ? '–' : '+'}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  aria-hidden={!open}
                  className={`blog-how-ai-panel${open ? ' is-open' : ''}`}
                >
                  <div className="blog-how-ai-panel-grid">
                    {item.intro ? <p className="blog-how-ai-intro">{item.intro}</p> : null}
                    {!item.intro && item.html ? (
                      <div
                        className="blog-how-ai-intro"
                        dangerouslySetInnerHTML={{ __html: sanitizeBlogBlockHtml(item.html) || '' }}
                      />
                    ) : null}
                    {item.bullets.length ? (
                      <ul className="blog-how-ai-chips">
                        {item.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
