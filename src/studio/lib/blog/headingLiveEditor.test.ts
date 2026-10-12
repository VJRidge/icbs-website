import { describe, expect, it } from 'vitest';
import { headingUsesLiveEditor } from './headingLiveEditor';

describe('headingUsesLiveEditor', () => {
  it('does not use the editor on public preview or unselected canvas widgets', () => {
    expect(headingUsesLiveEditor(false, false, true)).toBe(false);
    expect(headingUsesLiveEditor(false)).toBe(false);
  });

  it('uses the editor in the inspector and on a selected canvas heading', () => {
    expect(headingUsesLiveEditor(true, false, true)).toBe(true);
    expect(headingUsesLiveEditor(true, true, false)).toBe(true);
  });
});
