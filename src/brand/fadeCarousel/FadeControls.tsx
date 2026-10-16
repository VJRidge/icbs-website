import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { FadeArrowPosition, FadeArrowShape, FadeDotShape } from './fadeCarouselTypes';

export default function FadeControls({
  count,
  active,
  autoplay,
  playing,
  showArrows,
  showDots,
  showCounter,
  arrowsPosition,
  arrowsShape,
  arrowsSize,
  dotsShape,
  onPrev,
  onNext,
  onGo,
  onToggle,
}: {
  count: number;
  active: number;
  autoplay: boolean;
  playing: boolean;
  showArrows: boolean;
  showDots: boolean;
  showCounter: boolean;
  arrowsPosition: FadeArrowPosition;
  arrowsShape: FadeArrowShape;
  arrowsSize: number;
  dotsShape: FadeDotShape;
  onPrev: () => void;
  onNext: () => void;
  onGo: (index: number) => void;
  onToggle: () => void;
}) {
  const arrows = showArrows && count > 1 ? (
    <div className={`icbs-fade-arrows ${arrowsPosition}`}>
      <button type="button" className={`icbs-fade-arrow icbs-fade-arrow--prev shape-${arrowsShape}`} aria-label="Previous slide" onClick={onPrev}>
        <ChevronLeft size={arrowsSize} />
      </button>
      <button type="button" className={`icbs-fade-arrow icbs-fade-arrow--next shape-${arrowsShape}`} aria-label="Next slide" onClick={onNext}>
        <ChevronRight size={arrowsSize} />
      </button>
    </div>
  ) : null;

  return (
    <>
      {arrowsPosition === 'inside' ? arrows : null}
      <div className="icbs-fade-controls">
        {autoplay ? (
          <button
            type="button"
            className="icbs-fade-pause"
            aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
            onClick={onToggle}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
        ) : null}
        {arrowsPosition === 'outside' ? arrows : null}
        {showDots && count > 1 ? (
          <div className="icbs-fade-dots">
            {Array.from({ length: count }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
                className={`icbs-fade-dot shape-${dotsShape}${index === active ? ' is-active' : ''}`}
                onClick={() => onGo(index)}
              >
                {index === active ? <span className="icbs-fade-dot-progress" /> : null}
              </button>
            ))}
          </div>
        ) : null}
        {showCounter ? (
          <p className="icbs-fade-count" aria-hidden>
            {active + 1} / {count}
          </p>
        ) : null}
      </div>
    </>
  );
}
