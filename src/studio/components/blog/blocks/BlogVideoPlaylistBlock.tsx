import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function extractYoutubeId(raw: string): string {
  const m = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([^&?/\s]+)/);
  return (m?.[1] || raw || '').trim();
}

type Vid = { videoId: string; title: string };

export default function BlogVideoPlaylistBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const raw = Array.isArray(block.data.videos) ? block.data.videos : [];
  const videos: Vid[] =
    raw.length > 0
      ? raw.map((r: unknown) => {
          const o = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};
          return { videoId: String(o.videoId ?? ''), title: String(o.title ?? '') };
        })
      : [{ videoId: '', title: '' }];
  const layout = String(block.data.layout ?? 'stack') === 'grid' ? 'grid' : 'stack';

  const setVideos = (next: Vid[]) => updateBlock(block.id, { videos: next });

  if (!isEditing) {
    const gridClass = layout === 'grid' ? 'grid gap-6 sm:grid-cols-2' : 'flex flex-col gap-8';
    return (
      <section className={`my-10 ${gridClass}`}>
        {videos
          .map((v) => ({ ...v, id: extractYoutubeId(v.videoId) }))
          .filter((v) => v.id)
          .map((v, i) => (
            <figure key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
              <div className="aspect-video w-full">
                <iframe
                  title={v.title || 'Video'}
                  src={`https://www.youtube-nocookie.com/embed/${v.id}`}
                  className="h-full w-full"
                  loading="lazy"
                  allowFullScreen
                />
              </div>
              {v.title.trim() ? <figcaption className="bg-slate-900 px-3 py-2 text-center text-xs font-bold text-white">{v.title}</figcaption> : null}
            </figure>
          ))}
      </section>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex gap-2">
        {(['stack', 'grid'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => updateBlock(block.id, { layout: l })}
            className={`rounded-lg px-3 py-1 text-xs font-black uppercase ${layout === l ? 'bg-brand-blue text-brand-yellow' : 'bg-white'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {videos.map((v, i) => (
        <div key={i} className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <input
            value={v.videoId}
            onChange={(e) => {
              const next = [...videos];
              next[i] = { ...v, videoId: e.target.value };
              setVideos(next);
            }}
            placeholder="YouTube URL or video ID"
            className="min-w-[12rem] flex-1 rounded border border-slate-200 px-2 py-2 font-mono text-xs"
          />
          <input
            value={v.title}
            onChange={(e) => {
              const next = [...videos];
              next[i] = { ...v, title: e.target.value };
              setVideos(next);
            }}
            placeholder="Title (optional)"
            className="min-w-[8rem] flex-1 rounded border border-slate-200 px-2 py-2 text-sm"
          />
          <button type="button" onClick={() => setVideos(videos.filter((_, j) => j !== i))} className="text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setVideos([...videos, { videoId: '', title: '' }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2 text-xs font-black uppercase"
      >
        <Plus className="h-4 w-4" /> Add video
      </button>
    </div>
  );
}
