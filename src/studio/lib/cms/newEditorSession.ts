/** Wipe the form only when opening /new — not after autosave, and not if the user already typed a title. */
export function shouldResetNewEditorSession(
  pageId: string | undefined,
  lastPageId: string | null,
  hasInProgressNewDraft: boolean,
): boolean {
  if (pageId !== 'new') return false;
  if (lastPageId === 'new') return false;
  if (lastPageId == null && hasInProgressNewDraft) return false;
  return true;
}
