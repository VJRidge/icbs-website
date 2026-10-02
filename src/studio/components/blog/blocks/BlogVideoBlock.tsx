import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';
import { isDirectVideoUrl, videoBlockEmbedSrc, youtubeEmbedSrcFromUrl } from '../../../lib/blog/blogVideoEmbed';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogVideoBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const url = String(block.data.url ?? '').trim();
  const caption = String(block.data.caption ?? '');

  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserId(data.session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onPickFile = useCallback(
    async (file: File) => {
      if (!userId) {
        setErr('Sign in to upload video.');
        return;
      }
      setUploading(true);
      setErr(null);
      try {
        const publicUrl = await uploadLandingMedia(userId, file);
        updateBlock(block.id, { url: publicUrl });
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [userId, block.id, updateBlock],
  );

  const embedSrc = url ? videoBlockEmbedSrc(url) : '';
  const yt = url ? youtubeEmbedSrcFromUrl(url) : null;
  const direct = url ? isDirectVideoUrl(url) : false;

  if (!isEditing) {
    if (!url) return null;
    if (direct) {
      return (
        <figure className="my-4">
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <video src={url} controls playsInline className="h-full w-full object-contain" preload="metadata" />
          </div>
          {caption.trim() ? (
            <figcaption className="mt-2 text-center text-xs italic text-slate-500">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }
    if (!embedSrc) return null;
    return (
      <figure className="my-4">
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe src={embedSrc} title={yt ? 'YouTube' : 'Video'} allowFullScreen className="h-full w-full" loading="lazy" />
        </div>
        {caption.trim() ? (
          <figcaption className="mt-2 text-center text-xs italic text-slate-500">{caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-slate-500">
        Upload MP4/WebM/MOV to <span className="font-mono">landing-media</span> (same as landing & events), pick from your library, or paste a YouTube or embed URL.
      </p>

      <div className="flex flex-wrap gap-2">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 ${
            !userId || uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {uploading ? 'Uploading…' : 'Upload video'}
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            disabled={!userId || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void onPickFile(f);
            }}
          />
        </label>
        <button
          type="button"
          disabled={!userId}
          onClick={() =>
            openMediaLibrary((picked) => {
              updateBlock(block.id, { url: picked });
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Media library
        </button>
      </div>

      <input
        value={url}
        onChange={(e) => updateBlock(block.id, { url: e.target.value })}
        placeholder="https://… (YouTube, Vimeo watch URL, or direct MP4 after upload)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={caption}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {err ? <p className="text-xs text-red-600">{err}</p> : null}

      {url ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-black">
          {direct ? (
            <video src={url} controls playsInline className="max-h-64 w-full object-contain" preload="metadata" />
          ) : embedSrc ? (
            <div className="aspect-video">
              <iframe src={embedSrc} title="Preview" className="h-full w-full" />
            </div>
          ) : (
            <p className="p-4 text-center text-xs text-slate-400">Enter a valid URL or upload a file.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
