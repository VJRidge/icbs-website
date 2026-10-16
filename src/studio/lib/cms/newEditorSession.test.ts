import { describe, expect, it } from 'vitest';
import { shouldResetNewEditorSession } from './newEditorSession';

describe('shouldResetNewEditorSession', () => {
  it('resets when first landing on /new with an empty form', () => {
    expect(shouldResetNewEditorSession('new', null, false)).toBe(true);
  });

  it('does not reset after autosave while the route is still /new', () => {
    expect(shouldResetNewEditorSession('new', 'new', false)).toBe(false);
    expect(shouldResetNewEditorSession('new', 'new', true)).toBe(false);
  });

  it('does not wipe a title typed before the admin profile finishes loading', () => {
    expect(shouldResetNewEditorSession('new', null, true)).toBe(false);
  });

  it('resets when navigating from an existing post to /new', () => {
    expect(shouldResetNewEditorSession('new', 'abc', true)).toBe(true);
    expect(shouldResetNewEditorSession('new', 'abc', false)).toBe(true);
  });

  it('does not reset on an existing post route', () => {
    expect(shouldResetNewEditorSession('abc', 'new', false)).toBe(false);
  });
});
