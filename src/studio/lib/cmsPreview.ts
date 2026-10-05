import type { PostMeta } from '../pages/PublisherSitePageDetailPage';
import type { PublishedPageDocument } from '../types';

export const CMS_PREVIEW_KEY = 'icbs.cmsPreview';

export type CmsPreviewPayload = {
  title: string;
  document: PublishedPageDocument;
  post?: PostMeta;
};

export function writeCmsPreview(payload: CmsPreviewPayload): void {
  const raw = JSON.stringify(payload);
  localStorage.setItem(CMS_PREVIEW_KEY, raw);
}

export function readCmsPreview(): CmsPreviewPayload | null {
  try {
    const raw = localStorage.getItem(CMS_PREVIEW_KEY) || sessionStorage.getItem(CMS_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CmsPreviewPayload;
    if (!parsed || typeof parsed.title !== 'string' || !parsed.document) return null;
    return parsed;
  } catch {
    return null;
  }
}
