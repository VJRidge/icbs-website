import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function extractYoutubeId(raw: string): string {
  const m = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]+)/);
  return (m?.[1] || raw || '').trim();
}

export default function BlogYoutubeBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const videoId = String(block.data.videoId ?? '');
  const caption = String(block.data.caption ?? '');
  const start = Number(block.data.start) || 0;
  const id = videoId ? extractYoutubeId(videoId) : '';
  const embedUrl = id ? `https://www.youtube-nocookie.com/embed/${id}?start=${start}` : '';

  if (!isEditing) {
    if (!embedUrl) return null;
    return (
      <figure className="my-4">
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={embedUrl}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
          />
        </div>
        {caption.trim() ? (
          <figcaption className="mt-2 text-center text-xs italic text-slate-500">{caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={videoId}
        onChange={(e) => updateBlock(block.id, { videoId: e.target.value })}
        placeholder="YouTube URL or video ID"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        value={caption}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {embedUrl ? (
        <div className="mt-2 aspect-video overflow-hidden rounded-xl bg-black">
          <iframe src={embedUrl} title="YouTube preview" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  );
}
