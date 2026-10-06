import type { CmsPreviewPayload } from '../cmsPreview';

export const CMS_PREVIEW_TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export function previewExpiresAt(now = Date.now()): string {
  return new Date(now + CMS_PREVIEW_TOKEN_TTL_MS).toISOString();
}

export function buildSecurePreviewCreateBody(payload: CmsPreviewPayload & { contentId?: string | null }) {
  return {
    contentId: payload.contentId ?? null,
    title: payload.title,
    document: payload.document,
    post: payload.post ?? null,
  };
}

export function securePreviewPath(token: string): string {
  return `/preview?token=${encodeURIComponent(token)}`;
}

export function isPreviewExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return true;
  return t <= now;
}
