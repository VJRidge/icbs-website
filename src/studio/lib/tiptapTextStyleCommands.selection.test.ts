import { describe, expect, it } from 'vitest';
import { rememberedToolbarSelection, selectionToRestore } from './tiptapTextStyleCommands';

describe('rememberedToolbarSelection', () => {
  it('keeps a highlighted range', () => {
    expect(
      rememberedToolbarSelection({
        live: { from: 4, to: 12 },
        editorHasFocus: true,
      }),
    ).toEqual({ from: 4, to: 12 });
  });

  it('keeps the caret while the editor still has focus', () => {
    expect(
      rememberedToolbarSelection({
        live: { from: 88, to: 88 },
        editorHasFocus: true,
      }),
    ).toEqual({ from: 88, to: 88 });
  });

  it('does not replace a caret with the start of the document after blur', () => {
    expect(
      rememberedToolbarSelection({
        live: { from: 1, to: 1 },
        previouslySaved: { from: 88, to: 88 },
        editorHasFocus: false,
      }),
    ).toEqual({ from: 88, to: 88 });
  });

  it('keeps a frozen highlight instead of a collapsed blur', () => {
    expect(
      rememberedToolbarSelection({
        live: { from: 1, to: 1 },
        frozen: { from: 10, to: 20 },
        editorHasFocus: false,
      }),
    ).toEqual({ from: 10, to: 20 });
  });
});

describe('selectionToRestore', () => {
  it('keeps the live caret while the editor is focused', () => {
    expect(
      selectionToRestore({
        live: { from: 88, to: 88 },
        saved: { from: 4, to: 12 },
        frozen: { from: 4, to: 12 },
        editorHasFocus: true,
      }),
    ).toEqual({ from: 88, to: 88 });
  });

  it('prefers the saved caret over an older frozen highlight after blur', () => {
    expect(
      selectionToRestore({
        live: { from: 1, to: 1 },
        saved: { from: 88, to: 88 },
        frozen: { from: 1, to: 40 },
        editorHasFocus: false,
      }),
    ).toEqual({ from: 88, to: 88 });
  });
});
