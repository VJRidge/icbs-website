import { createContext, useCallback, useContext, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';
import type { BlogBlockType } from '../../../lib/blog/blogBlockTypes';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';

export const BlogFileDropTargetContext = createContext<string | null>(null);

type Target = { id: string; type: string } | null;

function pickFiles(dt: DataTransfer | null, kind: 'image' | 'video'): File[] {
  if (!dt?.files?.length) return [];
  return Array.from(dt.files).filter((f) => (kind === 'image' ? f.type.startsWith('image/') : f.type.startsWith('video/')));
}

function resolveBlockUnderPoint(clientX: number, clientY: number): Target {
  const top = document.elementFromPoint(clientX, clientY);
  if (!top) return null;
  const hit = top.closest('[data-blog-block-id]');
  if (!(hit instanceof HTMLElement)) return null;
  const id = hit.getAttribute('data-blog-block-id');
  if (!id) return null;
  return { id, type: hit.getAttribute('data-blog-block-type') ?? '' };
}

const GIMG = (url: string) => ({ url, alt: '', caption: '', credit: '', focalX: 50, focalY: 50 });
const SSLIDE = (url: string) => ({ url, alt: '', caption: '', credit: '' });
const CITEM = (url: string) => ({ url, alt: '', caption: '' });

export default function BlogEditorFileDrop({ userId, children }: { userId: string | null; children: ReactNode }) {
  const { blocks, addBlock, updateBlock } = useBlogEditorStore();
  const [target, setTarget] = useState<Target>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const clearTargetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClearTarget = useCallback(() => {
    if (clearTargetTimer.current) clearTimeout(clearTargetTimer.current);
    clearTargetTimer.current = setTimeout(() => {
      clearTargetTimer.current = null;
      setTarget(null);
    }, 180);
  }, []);

  const applyImageUrls = useCallback(
    (t: Target, urls: string[]) => {
      if (!urls.length) return;
      if (!t) {
        addBlock('gallery', null, { images: urls.map(GIMG) });
        return;
      }
      const block = blocks.find((b) => b.id === t.id);
      if (!block) {
        addBlock('gallery', null, { images: urls.map(GIMG) });
        return;
      }
      const type = block.type as BlogBlockType;

      if (type === 'gallery') {
        const raw = Array.isArray(block.data.images) ? block.data.images : [];
        const existing = raw.map((row: unknown) => {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            url: String(o.url ?? ''),
            alt: String(o.alt ?? ''),
            caption: String(o.caption ?? ''),
            credit: String(o.credit ?? ''),
            focalX: Number(o.focalX) >= 0 ? Number(o.focalX) : 50,
            focalY: Number(o.focalY) >= 0 ? Number(o.focalY) : 50,
          };
        });
        updateBlock(block.id, { images: [...existing, ...urls.map(GIMG)] });
        return;
      }

      if (type === 'slideshow') {
        const raw = Array.isArray(block.data.slides) ? block.data.slides : [];
        const existing = raw.map((s: unknown) => {
          const o = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
          return {
            url: String(o.url ?? ''),
            alt: String(o.alt ?? ''),
            caption: String(o.caption ?? ''),
            credit: String(o.credit ?? ''),
          };
        });
        updateBlock(block.id, { slides: [...existing, ...urls.map(SSLIDE)] });
        return;
      }

      if (type === 'carousel') {
        const raw = Array.isArray(block.data.items) ? block.data.items : [];
        const existing = raw.map((row: unknown) => {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          return {
            url: String(o.url ?? ''),
            alt: String(o.alt ?? ''),
            caption: String(o.caption ?? ''),
            videoUrl: typeof o.videoUrl === 'string' ? o.videoUrl : undefined,
          };
        });
        updateBlock(block.id, { items: [...existing, ...urls.map(CITEM)] });
        return;
      }

      if (type === 'image') {
        if (urls.length === 1) {
          updateBlock(block.id, { url: urls[0], alt: String(block.data.alt ?? '') || 'Image' });
        } else {
          addBlock('gallery', block.id, { images: urls.map(GIMG) });
        }
        return;
      }

      addBlock('gallery', block.id, { images: urls.map(GIMG) });
    },
    [blocks, addBlock, updateBlock],
  );

  const applyVideoUrl = useCallback(
    (t: Target, url: string) => {
      if (!t) {
        addBlock('video', null, { url, caption: '' });
        return;
      }
      const block = blocks.find((b) => b.id === t.id);
      if (!block) {
        addBlock('video', null, { url, caption: '' });
        return;
      }
      if (block.type === 'video') {
        updateBlock(block.id, { url });
        return;
      }
      addBlock('video', block.id, { url, caption: '' });
    },
    [blocks, addBlock, updateBlock],
  );

  const onDragEnter = (e: DragEvent) => {
    if (!userId || !e.dataTransfer.types?.includes?.('Files')) return;
    e.preventDefault();
  };

  const onDragOver = (e: DragEvent) => {
    if (!userId || !e.dataTransfer.types?.includes?.('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (clearTargetTimer.current) {
      clearTimeout(clearTargetTimer.current);
      clearTargetTimer.current = null;
    }
    setTarget(resolveBlockUnderPoint(e.clientX, e.clientY));
  };

  const onDragLeave = () => {
    scheduleClearTarget();
  };

  const onDrop = async (e: DragEvent) => {
    if (clearTargetTimer.current) {
      clearTimeout(clearTargetTimer.current);
      clearTargetTimer.current = null;
    }
    setTarget(null);
    if (!userId) {
      window.alert('Sign in to drop files into the editor.');
      e.preventDefault();
      return;
    }
    if (!e.dataTransfer.types?.includes?.('Files')) return;
    e.preventDefault();
    e.stopPropagation();

    const t = resolveBlockUnderPoint(e.clientX, e.clientY);
    const images = pickFiles(e.dataTransfer, 'image');
    const videos = pickFiles(e.dataTransfer, 'video');

    const blockType = t ? (blocks.find((b) => b.id === t.id)?.type as BlogBlockType | undefined) : undefined;
    const wantVideo = blockType === 'video' || (videos.length > 0 && images.length === 0);

    if (wantVideo && videos.length) {
      setBusy(true);
      setBusyLabel('Uploading video…');
      try {
        const url = await uploadLandingMedia(userId, videos[0]!);
        applyVideoUrl(t, url);
        if (videos.length > 1) window.alert('Only the first video was added. Drop others one at a time or use the video block upload.');
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Video upload failed');
      } finally {
        setBusy(false);
        setBusyLabel('');
      }
      return;
    }

    if (!images.length) {
      window.alert('Drop image files (or a video onto a video block).');
      return;
    }

    setBusy(true);
    setBusyLabel(`Uploading ${images.length} image${images.length > 1 ? 's' : ''}…`);
    const urls: string[] = [];
    try {
      for (const f of images) {
        urls.push(await uploadLandingMedia(userId, f));
      }
      applyImageUrls(t, urls);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  return (
    <BlogFileDropTargetContext.Provider value={target?.id ?? null}>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col" onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
        {children}
        {busy ? (
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
            {busyLabel || 'Uploading…'}
          </div>
        ) : null}
      </div>
    </BlogFileDropTargetContext.Provider>
  );
}

export function useBlogFileDropTargetId(): string | null {
  return useContext(BlogFileDropTargetContext);
}
