import { describe, expect, it } from 'vitest';
import { pickFocusedEditor, shouldSplitTextblockBeforeList } from './blogEditorFocus';

describe('shouldSplitTextblockBeforeList', () => {
  it('splits when the caret is after the colon in the middle of a paragraph', () => {
    expect(shouldSplitTextblockBeforeList(40, 80)).toBe(true);
  });

  it('does not split at the start or end of the paragraph', () => {
    expect(shouldSplitTextblockBeforeList(0, 80)).toBe(false);
    expect(shouldSplitTextblockBeforeList(80, 80)).toBe(false);
  });
});

describe('pickFocusedEditor', () => {
  const panel = { name: 'panel' };
  const canvas = { name: 'canvas' };

  it('uses the editor that currently has focus', () => {
    expect(
      pickFocusedEditor(
        [
          { editor: panel, hasFocus: false },
          { editor: canvas, hasFocus: true },
        ],
        panel,
      ),
    ).toBe(canvas);
  });

  it('falls back to the last focused editor after the toolbar steals focus', () => {
    expect(
      pickFocusedEditor(
        [
          { editor: panel, hasFocus: false },
          { editor: canvas, hasFocus: false },
        ],
        canvas,
      ),
    ).toBe(canvas);
  });

  it('uses the first living editor when none were focused', () => {
    expect(
      pickFocusedEditor(
        [
          { editor: panel, hasFocus: false },
          { editor: canvas, hasFocus: false },
        ],
        null,
      ),
    ).toBe(panel);
  });
});
