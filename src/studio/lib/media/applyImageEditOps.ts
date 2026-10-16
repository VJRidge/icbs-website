import type { ImageEditOp } from './imageEditOps';
import { clampCrop } from './imageEditOps';

function canvasFromSize(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function drawSource(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = canvasFromSize(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function applyOne(source: HTMLCanvasElement, op: ImageEditOp): HTMLCanvasElement {
  if (op.type === 'flip') {
    const canvas = canvasFromSize(source.width, source.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    if (op.axis === 'horizontal') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(source, 0, 0);
    return canvas;
  }
  if (op.type === 'rotate') {
    const quarter = op.quarterTurns % 4;
    const swap = quarter % 2 === 1;
    const canvas = canvasFromSize(swap ? source.height : source.width, swap ? source.width : source.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available.');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((quarter * Math.PI) / 2);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    return canvas;
  }
  if (op.type === 'scale') {
    return drawSource(source, op.width, op.height);
  }
  const crop = clampCrop(op, { width: source.width, height: source.height });
  const canvas = canvasFromSize(crop.width, crop.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas;
}

export function applyImageEditOps(
  source: HTMLImageElement | HTMLCanvasElement,
  ops: ImageEditOp[],
): HTMLCanvasElement {
  const width = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height;
  let canvas = drawSource(source, width, height);
  for (const op of ops) canvas = applyOne(canvas, op);
  return canvas;
}

export function mimeFromFileName(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.avif$/i.test(name)) return 'image/avif';
  return 'image/jpeg';
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not encode the edited image.'));
        else resolve(blob);
      },
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}
