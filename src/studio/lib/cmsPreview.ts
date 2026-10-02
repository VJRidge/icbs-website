import type { PostMeta } from '../pages/PublisherSitePageDetailPage';
import type { PublishedPageDocument } from '../types';

export const CMS_PREVIEW_KEY = 'icbs.cmsPreview';

export type CmsPreviewPayload = {
  title: string;
  document: PublishedPageDocument;
  post?: PostMeta;
};

export function writeCmsPreview(payload: CmsPreviewPayload): void {
  sessionStorage.setItem(CMS_PREVIEW_KEY, JSON.stringify(payload));
}

export function readCmsPreview(): CmsPreviewPayload | null {
  try {
    const raw = sessionStorage.getItem(CMS_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CmsPreviewPayload;
    if (!parsed || typeof parsed.title !== 'string' || !parsed.document) return null;
    return parsed;
  } catch {
    return null;
  }
}
