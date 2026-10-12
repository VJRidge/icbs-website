import { describe, expect, it } from 'vitest';
import { cmsEditorMissingTitleHint, cmsEditorTitleIsEmpty } from './cmsEditorActions';

describe('cmsEditorActions', () => {
  it('treats blank and whitespace titles as empty', () => {
    expect(cmsEditorTitleIsEmpty('')).toBe(true);
    expect(cmsEditorTitleIsEmpty('   ')).toBe(true);
    expect(cmsEditorTitleIsEmpty(null)).toBe(true);
    expect(cmsEditorTitleIsEmpty('Creative Tools')).toBe(false);
  });

  it('explains that the article heading is not the post title', () => {
    expect(cmsEditorMissingTitleHint()).toMatch(/Post title/i);
    expect(cmsEditorMissingTitleHint()).toMatch(/heading/i);
  });
});
