import type { BlogBlock } from '../blog/blogBlockTypes';

const BLOG_PREFIX = 'hbcu_cms_blog_local_v1';
const PAGE_PREFIX = 'hbcu_cms_page_local_v1';

export type CmsEditorKind = 'blog' | 'page';

export type CmsEditorLocalDraft<TForm> = {
  v: 1;
  savedAt: string;
  form: TForm;
  blocks: BlogBlock[];
  slugTouched: boolean;
};

function prefixFor(kind: CmsEditorKind): string {
  return kind === 'blog' ? BLOG_PREFIX : PAGE_PREFIX;
}

export function cmsEditorDraftStorageKey(kind: CmsEditorKind, idOrNew: string): string {
  return `${prefixFor(kind)}_${idOrNew}`;
}

export function readCmsEditorLocalDraft<TForm>(kind: CmsEditorKind, idOrNew: string): CmsEditorLocalDraft<TForm> | null {
  try {
    const raw = localStorage.getItem(cmsEditorDraftStorageKey(kind, idOrNew));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CmsEditorLocalDraft<TForm>>;
    if (o?.v !== 1 || typeof o.savedAt !== 'string' || !o.form || !Array.isArray(o.blocks)) return null;
    return {
      v: 1,
      savedAt: o.savedAt,
      form: o.form,
      blocks: o.blocks as BlogBlock[],
      slugTouched: Boolean(o.slugTouched),
    };
  } catch {
    return null;
  }
}

export function writeCmsEditorLocalDraft<TForm>(
  kind: CmsEditorKind,
  idOrNew: string,
  payload: Omit<CmsEditorLocalDraft<TForm>, 'v' | 'savedAt'>,
): void {
  const env: CmsEditorLocalDraft<TForm> = {
    v: 1,
    savedAt: new Date().toISOString(),
    ...payload,
  };
  localStorage.setItem(cmsEditorDraftStorageKey(kind, idOrNew), JSON.stringify(env));
}

export function clearCmsEditorLocalDraft(kind: CmsEditorKind, idOrNew: string): void {
  localStorage.removeItem(cmsEditorDraftStorageKey(kind, idOrNew));
}

export function cmsEditorSnapshot<TForm>(form: TForm, blocks: BlogBlock[], slugTouched: boolean): string {
  return JSON.stringify({ form, blocks, slugTouched });
}

/** Update the address bar without a React Router navigation (avoids editor remount / blink). */
export function syncCmsEditorUrlSilently(path: string): void {
  if (window.location.pathname !== path) {
    window.history.replaceState(window.history.state, '', path);
  }
}
