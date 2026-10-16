import { describe, expect, it } from 'vitest';
import {
  clampCrop,
  cropBoxForAspect,
  redoEdit,
  scaleFromHeight,
  scaleFromWidth,
  sizeAfterOps,
  sizeAfterRotate,
  undoEdit,
} from './imageEditOps';

describe('imageEditOps', () => {
  it('swaps sides on a 90° turn and keeps them on 180°', () => {
    expect(sizeAfterRotate({ width: 700, height: 467 }, 1)).toEqual({ width: 467, height: 700 });
    expect(sizeAfterRotate({ width: 700, height: 467 }, 2)).toEqual({ width: 700, height: 467 });
  });

  it('clamps a crop inside the image and scales from width', () => {
    expect(clampCrop({ x: -10, y: 10, width: 900, height: 50 }, { width: 700, height: 467 })).toEqual({
      x: 0,
      y: 10,
      width: 700,
      height: 50,
    });
    expect(scaleFromWidth({ width: 700, height: 467 }, 350)).toEqual({ width: 350, height: 234 });
    expect(scaleFromHeight({ width: 700, height: 467 }, 234)).toEqual({ width: 351, height: 234 });
    expect(cropBoxForAspect({ width: 700, height: 467 }, 1, 1)).toEqual({
      x: 116,
      y: 0,
      width: 467,
      height: 467,
    });
  });

  it('applies rotate then crop to the live size and supports undo/redo', () => {
    const start = { width: 700, height: 467 };
    const rotated = sizeAfterOps(start, [{ type: 'rotate', quarterTurns: 1 }]);
    expect(rotated).toEqual({ width: 467, height: 700 });
    const cropped = sizeAfterOps(start, [
      { type: 'rotate', quarterTurns: 1 },
      { type: 'crop', x: 0, y: 0, width: 200, height: 100 },
    ]);
    expect(cropped).toEqual({ width: 200, height: 100 });
    const afterUndo = undoEdit({
      past: [[]],
      present: [{ type: 'flip', axis: 'horizontal' }],
      future: [],
    });
    expect(afterUndo.present).toEqual([]);
    expect(redoEdit(afterUndo).present).toEqual([{ type: 'flip', axis: 'horizontal' }]);
  });
});
