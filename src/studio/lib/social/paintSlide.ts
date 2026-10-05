import type { CarouselSlide } from './techCarousel';

const SIZE = 1080;
const FOREST = '#1A5340';
const YELLOW = '#F3D13D';
const CREAM = '#F7F7F2';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

export function paintSlide(slide: CarouselSlide, index: number, total: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, SIZE, 18);
  ctx.fillStyle = YELLOW;
  ctx.font = '600 28px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(slide.kicker.toUpperCase(), 72, 120);
  ctx.fillStyle = CREAM;
  ctx.font = '400 64px Anton, Impact, sans-serif';
  const headlines = wrap(ctx, slide.headline, 920).slice(0, 4);
  headlines.forEach((line, i) => ctx.fillText(line, 72, 230 + i * 78));
  ctx.fillStyle = CREAM;
  ctx.globalAlpha = 0.92;
  ctx.font = '400 32px Newsreader, Georgia, serif';
  const bodyTop = 250 + headlines.length * 78;
  wrap(ctx, slide.body, 900)
    .slice(0, 8)
    .forEach((line, i) => ctx.fillText(line, 72, bodyTop + i * 46));
  ctx.globalAlpha = 1;
  ctx.fillStyle = YELLOW;
  ctx.font = '600 24px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(`${index + 1}  /  ${total}`, 72, 1000);
  ctx.fillText('VETTAJIMALE.TECH', 620, 1000);
  return canvas;
}

export function downloadSlide(slide: CarouselSlide, index: number, total: number): void {
  const canvas = paintSlide(slide, index, total);
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `vettajimale-slide-${index + 1}.png`;
  link.click();
}
