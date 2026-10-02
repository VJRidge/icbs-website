import { useMemo } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { parseSocialEmbedInput, socialEmbedPlatformLabel } from '../../../lib/blog/socialEmbed';
import { useSocialEmbedScripts } from '../../../lib/blog/useSocialEmbedScripts';
import SocialEmbedView from '../SocialEmbedView';

export default function BlogSocialEmbedBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const input = String(block.data.input ?? '');
  const caption = String(block.data.caption ?? '');

  const parsed = useMemo(() => parseSocialEmbedInput(input), [input]);
  const scriptPlatforms = useMemo(
    () =>
      parsed.platform && parsed.blockquoteHtml && !parsed.iframeSrc ? [parsed.platform] : [],
    [parsed],
  );
  useSocialEmbedScripts(scriptPlatforms);

  if (!isEditing) {
    return <SocialEmbedView parsed={parsed} caption={caption} />;
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] leading-snug text-slate-500">
        Paste a <strong>public post URL</strong> or the platform&apos;s <strong>Embed code</strong> from Instagram,
        Facebook, TikTok, or LinkedIn. Public posts only — private or deleted posts will not render.
      </p>
      <textarea
        value={input}
        onChange={(e) => updateBlock(block.id, { input: e.target.value })}
        placeholder="https://www.instagram.com/p/… or paste embed HTML"
        rows={5}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed"
      />
      <input
        value={caption}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {parsed.platform ? (
        <p className="text-xs font-bold text-brand-blue">
          Detected: {socialEmbedPlatformLabel(parsed.platform)}
          {parsed.iframeSrc ? ' · iframe embed' : parsed.blockquoteHtml ? ' · rich embed' : ''}
        </p>
      ) : null}
      {parsed.error && input.trim() ? (
        <p className="text-xs font-semibold text-amber-700">{parsed.error}</p>
      ) : null}
      {input.trim() && (parsed.iframeSrc || parsed.blockquoteHtml) ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</p>
          <SocialEmbedView parsed={parsed} caption={caption} />
        </div>
      ) : null}
    </div>
  );
}
