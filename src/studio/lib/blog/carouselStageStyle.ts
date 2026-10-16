function num(raw: unknown, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hex(raw: unknown, fallback: string): string {
  const value = String(raw ?? '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
}

export type CarouselDotPosition = 'inside' | 'outside';
export type CarouselFit = 'cover' | 'contain';

export type CarouselStageStyle = {
  gap: number;
  height: number;
  widthPercent: number;
  radius: number;
  padding: number;
  borderWidth: number;
  borderColor: string;
  slideBg: string;
  fit: CarouselFit;
  arrowSize: number;
  arrowColor: string;
  arrowShadow: boolean;
  playSize: number;
  playColor: string;
  dotSize: number;
  dotGap: number;
  dotColor: string;
  dotActiveColor: string;
  dotPosition: CarouselDotPosition;
  lightbox: boolean;
  lightboxColor: string;
  lightboxUi: string;
  lightboxUiHover: string;
  lightboxWidth: number;
};

export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function readCarouselStageStyle(data: Record<string, unknown>, imageMode: boolean): CarouselStageStyle {
  const fit: CarouselFit = imageMode
    ? data.imageStretch
      ? 'cover'
      : 'contain'
    : String(data.imageFit ?? '') === 'contain'
      ? 'contain'
      : 'cover';
  const dotPosition = String(data.dotPosition ?? '') === 'inside' ? 'inside' : 'outside';
  return {
    gap: num(data.gap, imageMode ? 12 : 10, 0, 80),
    height: imageMode ? num(data.customHeight, 280, 80, 900) : num(data.height, 420, 120, 900),
    widthPercent: num(data.widthPercent ?? data.stageWidth, 100, 20, 100),
    radius: num(data.radius, 0, 0, 80),
    padding: num(data.slidePadding, 0, 0, 64),
    borderWidth: num(data.slideBorderWidth, 0, 0, 16),
    borderColor: hex(data.slideBorderColor, '#e2e8f0'),
    slideBg: hex(data.slideBg, '#000000'),
    fit,
    arrowSize: num(data.arrowSize, 28, 12, 80),
    arrowColor: hex(data.arrowColor, '#ffffff'),
    arrowShadow: data.arrowShadow !== false,
    playSize: num(data.playSize, 56, 24, 120),
    playColor: hex(data.playColor, '#ffffff'),
    dotSize: num(data.dotSize, 8, 4, 24),
    dotGap: num(data.dotGap, 6, 0, 32),
    dotColor: hex(data.dotColor, '#cbd5e1'),
    dotActiveColor: hex(data.dotActiveColor, '#1e293b'),
    dotPosition,
    lightbox: Boolean(data.lightbox),
    lightboxColor: hex(data.lightboxColor, '#000000'),
    lightboxUi: hex(data.lightboxUi, '#ffffff'),
    lightboxUiHover: hex(data.lightboxUiHover, '#e8b800'),
    lightboxWidth: num(data.lightboxWidth, 90, 40, 100),
  };
}
