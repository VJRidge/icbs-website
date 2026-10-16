export type Size = { width: number; height: number };

export type ImageEditOp =
  | { type: 'rotate'; quarterTurns: 1 | 2 | 3 }
  | { type: 'flip'; axis: 'horizontal' | 'vertical' }
  | { type: 'scale'; width: number; height: number }
  | { type: 'crop'; x: number; y: number; width: number; height: number };

export type EditHistory = {
  past: ImageEditOp[][];
  present: ImageEditOp[];
  future: ImageEditOp[][];
};

export function sizeAfterRotate(size: Size, quarterTurns: number): Size {
  return quarterTurns % 2 === 0 ? { width: size.width, height: size.height } : { width: size.height, height: size.width };
}

export function clampCrop(
  sel: { x: number; y: number; width: number; height: number },
  image: Size,
): { x: number; y: number; width: number; height: number } {
  const x = Math.max(0, Math.min(Math.round(sel.x), Math.max(0, image.width - 1)));
  const y = Math.max(0, Math.min(Math.round(sel.y), Math.max(0, image.height - 1)));
  const width = Math.max(1, Math.min(Math.round(sel.width), image.width - x));
  const height = Math.max(1, Math.min(Math.round(sel.height), image.height - y));
  return { x, y, width, height };
}

export function scaleFromWidth(size: Size, width: number): Size {
  const nextW = Math.max(1, Math.round(width));
  const nextH = Math.max(1, Math.round((size.height / Math.max(1, size.width)) * nextW));
  return { width: nextW, height: nextH };
}

export function scaleFromHeight(size: Size, height: number): Size {
  const nextH = Math.max(1, Math.round(height));
  const nextW = Math.max(1, Math.round((size.width / Math.max(1, size.height)) * nextH));
  return { width: nextW, height: nextH };
}

/** Largest box of aspectW:aspectH that fits inside the image, centered. */
export function cropBoxForAspect(
  image: Size,
  aspectW: number,
  aspectH: number,
): { x: number; y: number; width: number; height: number } {
  if (!(aspectW > 0) || !(aspectH > 0)) {
    return { x: 0, y: 0, width: image.width, height: image.height };
  }
  const ratio = aspectW / aspectH;
  let width = image.width;
  let height = Math.round(width / ratio);
  if (height > image.height) {
    height = image.height;
    width = Math.round(height * ratio);
  }
  const x = Math.floor((image.width - width) / 2);
  const y = Math.floor((image.height - height) / 2);
  return clampCrop({ x, y, width, height }, image);
}

export function sizeAfterOps(start: Size, ops: ImageEditOp[]): Size {
  return ops.reduce((size, op) => {
    if (op.type === 'rotate') return sizeAfterRotate(size, op.quarterTurns);
    if (op.type === 'flip') return size;
    if (op.type === 'scale') return { width: Math.max(1, Math.round(op.width)), height: Math.max(1, Math.round(op.height)) };
    return { width: Math.max(1, Math.round(op.width)), height: Math.max(1, Math.round(op.height)) };
  }, start);
}

export function commitEdit(history: EditHistory, op: ImageEditOp): EditHistory {
  return {
    past: [...history.past, history.present],
    present: [...history.present, op],
    future: [],
  };
}

export function undoEdit(history: EditHistory): EditHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoEdit(history: EditHistory): EditHistory {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function emptyHistory(): EditHistory {
  return { past: [], present: [], future: [] };
}
