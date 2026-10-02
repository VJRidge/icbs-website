import { useCallback, useEffect, useState } from 'react';
import { Copy, Link2, Loader2 } from 'lucide-react';
import {
  cmsShortLinkPublicUrl,
  createCmsShortLink,
  fetchCmsShortLink,
  type CmsShortLinkResourceType,
} from '../../lib/cmsShortLinks';
import { clipboardCopy } from '../../lib/clipboardCopy';

type CmsShortLinkPanelProps = {
  resourceType: CmsShortLinkResourceType;
  resourceId: string | null;
  isPublished: boolean;
  userId: string | null;
};

export default function CmsShortLinkPanel({ resourceType, resourceId, isPublished, userId }: CmsShortLinkPanelProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!resourceId) {
      setCode(null);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchCmsShortLink(resourceType, resourceId);
      setCode(row?.code ?? null);
    } catch {
      setCode(null);
    } finally {
      setLoading(false);
    }
  }, [resourceId, resourceType]);

  useEffect(() => {
    void load();
  }, [load]);

  const shortUrl = code ? cmsShortLinkPublicUrl(code) : '';

  const onCreate = async () => {
    if (!resourceId || !userId) return;
    setCreating(true);
    try {
      const row = await createCmsShortLink(resourceType, resourceId, userId);
      setCode(row.code);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not create short link.');
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!shortUrl) return;
    const ok = await clipboardCopy(shortUrl);
    window.alert(ok ? 'Short link copied.' : 'Could not copy. Copy the URL manually.');
  };

  return (
    <div className="space-y-2 border-t border-slate-200/80 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Short link</span>
        {code ? (
          <button
            type="button"
            onClick={() => void onCopy()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-brand-blue/30 hover:text-brand-blue"
          >
            <Copy size={11} /> Copy
          </button>
        ) : (
          <button
            type="button"
            disabled={!resourceId || !userId || creating || loading}
            onClick={() => void onCreate()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-blue/30 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-brand-blue transition-colors hover:bg-brand-blue/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
            Create
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-[11px] text-slate-400">Loading…</p>
      ) : code ? (
        <p className="break-all font-mono text-[11px] leading-snug text-slate-700">{shortUrl}</p>
      ) : (
        <p className="text-[10px] font-medium leading-snug text-slate-500">
          {!resourceId
            ? 'Save the post first to create a short link.'
            : 'Generate a compact link for social posts and QR codes.'}
        </p>
      )}
      {!isPublished && resourceId ? (
        <p className="text-[10px] font-medium leading-snug text-amber-700/90">
          Short links redirect only after this content is published.
        </p>
      ) : null}
    </div>
  );
}
