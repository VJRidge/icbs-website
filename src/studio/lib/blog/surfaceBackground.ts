import type { CSSProperties } from 'react';
import { safeHref } from './safeHref';

export type SurfaceBgType = '' | 'classic' | 'image' | 'video';
export type SurfaceImageSize = 'cover' | 'contain' | 'auto';

export type SurfaceBackground = {
  type: SurfaceBgType;
  color: string;
  imageUrl: string;
  imageSize: SurfaceImageSize;
  imagePosition: string;
  videoUrl: string;
  overlayColor: string;
  overlayOpacity: number;
  blendMode: string;
  blur: number;
  brightness: number;
};

const IMAGE_SIZES: SurfaceImageSize[] = ['cover', 'contain', 'auto'];
const TYPES: SurfaceBgType[] = ['', 'classic', 'image', 'video'];

export function cssColorToHex(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith('#') && (trimmed.length === 4 || trimmed.length >= 7)) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }
    return trimmed.slice(0, 7).toLowerCase();
  }
  const match = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i.exec(trimmed);
  if (!match) return '';
  if (match[4] != null && Number(match[4]) === 0) return '';
  const hex = [match[1], match[2], match[3]]
    .map((part) => Math.max(0, Math.min(255, Math.round(Number(part)))).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

export function paintedBackgroundHex(blockId: string, columnIndex?: number): string {
  if (typeof document === 'undefined') return '';
  const id = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(blockId) : blockId;
  let node: HTMLElement | null = null;
  if (columnIndex != null && columnIndex >= 0) {
    node = document.querySelector(`[data-col-parent="${id}"][data-col-index="${columnIndex}"]`);
  }
  if (!node) {
    node =
      (document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null) ??
      (document.querySelector(`[data-nested-id="${id}"]`) as HTMLElement | null) ??
      (document.querySelector(`[data-stack-id="${id}"]`) as HTMLElement | null) ??
      (document.querySelector(`[data-sec-id="${id}"]`) as HTMLElement | null);
  }
  while (node) {
    const painted = cssColorToHex(getComputedStyle(node).backgroundColor);
    if (painted) return painted;
    if (node.classList.contains('vj-canvas') || node.classList.contains('vj-sec')) break;
    node = node.parentElement;
  }
  return '';
}

export function emptySurfaceBackground(): SurfaceBackground {
  return {
    type: '',
    color: '',
    imageUrl: '',
    imageSize: 'cover',
    imagePosition: 'center center',
    videoUrl: '',
    overlayColor: '',
    overlayOpacity: 0,
    blendMode: 'normal',
    blur: 0,
    brightness: 100,
  };
}

function safeMediaUrl(raw: unknown): string {
  const href = safeHref(raw);
  if (!href) return '';
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return '';
  return href;
}

function asType(raw: unknown): SurfaceBgType {
  const value = String(raw ?? '') as SurfaceBgType;
  return TYPES.includes(value) ? value : '';
}

function asSize(raw: unknown): SurfaceImageSize {
  const value = String(raw ?? '') as SurfaceImageSize;
  return IMAGE_SIZES.includes(value) ? value : 'cover';
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function readSurfaceBackground(data: Record<string, unknown>): SurfaceBackground {
  const empty = emptySurfaceBackground();
  return {
    type: asType(data.backgroundType),
    color: String(data.backgroundColor ?? '').trim(),
    imageUrl: safeMediaUrl(data.backgroundImage),
    imageSize: asSize(data.backgroundSize),
    imagePosition: String(data.backgroundPosition ?? empty.imagePosition).trim() || empty.imagePosition,
    videoUrl: safeMediaUrl(data.backgroundVideo),
    overlayColor: String(data.backgroundOverlayColor ?? '').trim(),
    overlayOpacity: clamp(Number(data.backgroundOverlayOpacity ?? 0), 0, 100),
    blendMode: String(data.backgroundBlendMode ?? 'normal').trim() || 'normal',
    blur: clamp(Number(data.backgroundBlur ?? 0), 0, 40),
    brightness: clamp(Number(data.backgroundBrightness ?? 100), 0, 200),
  };
}

export function surfaceBackgroundPatch(bg: SurfaceBackground): Record<string, unknown> {
  return {
    backgroundType: bg.type,
    backgroundColor: bg.color,
    backgroundImage: safeMediaUrl(bg.imageUrl),
    backgroundSize: bg.imageSize,
    backgroundPosition: bg.imagePosition,
    backgroundVideo: safeMediaUrl(bg.videoUrl),
    backgroundOverlayColor: bg.overlayColor,
    backgroundOverlayOpacity: bg.overlayOpacity,
    backgroundBlendMode: bg.blendMode,
    backgroundBlur: bg.blur,
    backgroundBrightness: bg.brightness,
  };
}

export function mergeSurfaceBackground(
  current: SurfaceBackground,
  patch: Partial<SurfaceBackground>,
): SurfaceBackground {
  return { ...current, ...patch };
}

export function surfaceShellStyle(bg: SurfaceBackground): CSSProperties {
  if (!bg.type) return {};
  const style: CSSProperties = {};
  if (bg.color && (bg.type === 'classic' || bg.type === 'image')) {
    style.backgroundColor = bg.color;
  }
  if (bg.type === 'image' && bg.imageUrl && !surfaceMediaFilter(bg)) {
    style.backgroundImage = `url("${bg.imageUrl.replace(/"/g, '')}")`;
    style.backgroundSize = bg.imageSize;
    style.backgroundPosition = bg.imagePosition;
    style.backgroundRepeat = 'no-repeat';
  }
  return style;
}

export function surfaceMediaFilter(bg: SurfaceBackground): string | undefined {
  const parts: string[] = [];
  if (bg.blur > 0) parts.push(`blur(${bg.blur}px)`);
  if (bg.brightness !== 100) parts.push(`brightness(${bg.brightness / 100})`);
  return parts.length ? parts.join(' ') : undefined;
}

export function hasSurfaceOverlay(bg: SurfaceBackground): boolean {
  return Boolean(bg.overlayColor) && bg.overlayOpacity > 0;
}

export function hasSurfaceVideo(bg: SurfaceBackground): boolean {
  return bg.type === 'video' && Boolean(bg.videoUrl);
}

export function hasSurfaceLayers(bg: SurfaceBackground): boolean {
  return hasSurfaceVideo(bg) || hasSurfaceOverlay(bg) || Boolean(surfaceMediaFilter(bg));
}

export function readColumnSurface(data: Record<string, unknown>, index: number): SurfaceBackground {
  const list = Array.isArray(data.columnSurfaces) ? data.columnSurfaces : [];
  const slot = list[index];
  if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return emptySurfaceBackground();
  return readSurfaceBackground(slot as Record<string, unknown>);
}

export function withColumnSurface(
  data: Record<string, unknown>,
  count: number,
  index: number,
  bg: SurfaceBackground,
): Record<string, unknown> {
  const raw = Array.isArray(data.columnSurfaces) ? data.columnSurfaces : [];
  const next = Array.from({ length: Math.max(count, index + 1, raw.length) }, (_, i) => raw[i] ?? null);
  next[index] = surfaceBackgroundPatch(bg);
  return { columnSurfaces: next };
}
