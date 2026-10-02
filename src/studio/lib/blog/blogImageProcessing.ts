/** Client-side image adjustments via canvas (export as JPEG for re-upload). */

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
};

export function cssFilterFromAdjustments(adj: ImageAdjustments): string {
  const b = Math.max(50, Math.min(150, adj.brightness));
  const c = Math.max(50, Math.min(150, adj.contrast));
  const s = Math.max(0, Math.min(200, adj.saturation));
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for editing.'));
    img.src = url;
  });
}

export async function renderAdjustedImageBlob(
  url: string,
  adj: ImageAdjustments,
  crop?: { x: number; y: number; w: number; h: number },
): Promise<Blob> {
  const img = await loadImage(url);
  const sx = crop ? (crop.x / 100) * img.naturalWidth : 0;
  const sy = crop ? (crop.y / 100) * img.naturalHeight : 0;
  const sw = crop ? (crop.w / 100) * img.naturalWidth : img.naturalWidth;
  const sh = crop ? (crop.h / 100) * img.naturalHeight : img.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  const b = adj.brightness / 100;
  const c = adj.contrast / 100;
  const s = adj.saturation / 100;
  ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s})`;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not export image.'));
      },
      'image/jpeg',
      0.92,
    );
  });
}

/** Simple lighten pass (boost shadows/midtones) — baked into brightness slider. */
export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
};
