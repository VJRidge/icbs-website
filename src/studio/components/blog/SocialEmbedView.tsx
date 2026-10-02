import {
  sanitizeSocialEmbedBlockquote,
  socialEmbedIframeHeight,
  socialEmbedPlatformLabel,
  type ParsedSocialEmbed,
} from '../../lib/blog/socialEmbed';
import { cn } from '../../lib/utils';

type Props = {
  parsed: ParsedSocialEmbed;
  caption?: string;
  className?: string;
};

export default function SocialEmbedView({ parsed, caption, className }: Props) {
  const { platform, iframeSrc, blockquoteHtml, error } = parsed;
  const label = socialEmbedPlatformLabel(platform);

  if (error && !iframeSrc && !blockquoteHtml) {
    return (
      <div className={cn('rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900', className)}>
        {error}
      </div>
    );
  }

  const showIframe = Boolean(iframeSrc);
  const showBlockquote = Boolean(blockquoteHtml) && !showIframe;

  if (!showIframe && !showBlockquote) return null;

  const minHeight = socialEmbedIframeHeight(platform);

  return (
    <figure className={cn('blog-social-embed my-8', className)}>
      {showIframe ? (
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={{ minHeight }}
        >
          <iframe
            src={iframeSrc!}
            title={`${label} embed`}
            className="w-full border-0"
            style={{ minHeight }}
            loading="lazy"
            allow="encrypted-media; clipboard-write"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
      {showBlockquote ? (
        <div
          className="blog-social-embed-blockquote flex justify-center [&_.instagram-media]:mx-auto [&_.instagram-media]:max-w-full! [&_.tiktok-embed]:mx-auto"
          dangerouslySetInnerHTML={{ __html: sanitizeSocialEmbedBlockquote(blockquoteHtml!) }}
        />
      ) : null}
      {caption?.trim() ? (
        <figcaption className="mt-2 text-center text-xs italic text-slate-500">{caption.trim()}</figcaption>
      ) : null}
    </figure>
  );
}
