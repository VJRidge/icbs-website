import { useCallback, useRef } from 'react';
import { coerceBlogHtmlForRendering, isFullHtmlDocument, manuscriptLooksLikeHtml } from '../../lib/opEdManuscript';
import { sanitizeOpEdHtml, sanitizeOpEdHtmlWholeDocument } from '../../lib/sanitizeOpEdHtml';

function FullDocumentIframe({ srcDoc }: { srcDoc: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const onLoad = useCallback(() => {
    const el = ref.current;
    if (!el?.contentDocument?.body) return;
    const d = el.contentDocument;
    const h = Math.max(d.documentElement?.scrollHeight ?? 0, d.body.scrollHeight, 400);
    el.style.height = `${Math.min(h + 48, 16000)}px`;
  }, []);

  return (
    <iframe
      ref={ref}
      title="Article HTML"
      srcDoc={srcDoc}
      onLoad={onLoad}
      className="w-full min-h-[min(70vh,720px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      sandbox="allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-same-origin"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

type BlogArticleHtmlDisplayProps = {
  html: string;
  /** Shown only for full-document HTML (admin / preview UX). */
  showFullDocumentCaption?: boolean;
};

/**
 * Renders blog `body` HTML: plain text, TipTap-style fragments, or full documents (`<!DOCTYPE html>…`)
 * in a sandboxed iframe so embedded `<style>` and layout match a standalone file.
 */
export default function BlogArticleHtmlDisplay({ html, showFullDocumentCaption }: BlogArticleHtmlDisplayProps) {
  const raw = coerceBlogHtmlForRendering(html || '');
  if (!manuscriptLooksLikeHtml(raw)) {
    return <div className="whitespace-pre-wrap text-[17px] leading-[1.75] text-slate-700">{raw}</div>;
  }

  if (isFullHtmlDocument(raw)) {
    const safe = sanitizeOpEdHtmlWholeDocument(raw);
    return (
      <div className="not-prose w-full max-w-none">
        {showFullDocumentCaption ? (
          <p className="mb-3 text-[12px] font-medium leading-relaxed text-slate-600">
            Full HTML page: layout and styles from your paste are applied inside the frame below (same as on the live article).
          </p>
        ) : null}
        <FullDocumentIframe srcDoc={safe} />
      </div>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: sanitizeOpEdHtml(raw) }} />;
}
