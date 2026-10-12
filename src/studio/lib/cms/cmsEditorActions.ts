export const STUDIO_POST_TITLE_ID = 'studio-post-title';

export function cmsEditorTitleIsEmpty(title: string | null | undefined): boolean {
  return !String(title ?? '').trim();
}

export function cmsEditorMissingTitleHint(): string {
  return 'Type a title in the Post title field first. The heading in the article is not the post title.';
}

export function focusStudioPostTitle(): void {
  const el = document.getElementById(STUDIO_POST_TITLE_ID);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.focus();
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
