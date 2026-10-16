import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Image as ImageIcon, Palette, Video } from 'lucide-react';
import BlogInspectorColorControl from './BlogInspectorColorControl';
import BlogInspectorSection from './BlogInspectorSection';
import { BlogInspectorFieldRow } from './BlogInspectorFieldRow';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import { cloneBlocks } from '../../../lib/blog/editorHistory';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import {
  emptySurfaceBackground,
  mergeSurfaceBackground,
  paintedBackgroundHex,
  type SurfaceBackground,
  type SurfaceBgType,
  type SurfaceImageSize,
} from '../../../lib/blog/surfaceBackground';

const TYPES: { id: SurfaceBgType; label: string; icon: typeof Palette }[] = [
  { id: 'classic', label: 'Color', icon: Palette },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
];

const SIZES: { id: SurfaceImageSize; label: string }[] = [
  { id: 'cover', label: 'Cover' },
  { id: 'contain', label: 'Contain' },
  { id: 'auto', label: 'Auto' },
];

const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'soft-light'];

export default function SurfaceBackgroundInspector({
  blockId,
  value,
  onChange,
  title = 'Background',
  columnIndex,
}: {
  blockId: string;
  value: SurfaceBackground;
  onChange: (next: SurfaceBackground) => void;
  title?: string;
  columnIndex?: number;
}) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const pushUndoSnapshot = useBlogEditorStore((s) => s.pushUndoSnapshot);
  const bg = { ...emptySurfaceBackground(), ...value };
  const snap = useRef<ReturnType<typeof cloneBlocks> | null>(null);
  const [painted, setPainted] = useState('#f7f7f2');

  useLayoutEffect(() => {
    const hex = paintedBackgroundHex(blockId, columnIndex);
    if (hex) setPainted(hex);
  }, [blockId, columnIndex, bg.color, bg.type]);

  const begin = () => {
    if (snap.current) return;
    snap.current = cloneBlocks(useBlogEditorStore.getState().blocks);
    pushUndoSnapshot('Changed background', snap.current);
  };
  const finish = () => {
    snap.current = null;
  };
  const patch = (partial: Partial<SurfaceBackground>, gesture = false) => {
    begin();
    onChange(mergeSurfaceBackground(bg, partial));
    if (!gesture) finish();
  };

  useEffect(() => {
    const end = () => finish();
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);
  const setType = (type: SurfaceBgType) => patch({ type: bg.type === type ? '' : type });
  const onSliderDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.button === 0) begin();
  };

  return (
    <div data-studio-history="widgets">
    <BlogInspectorSection title={title}>
      <BlogInspectorFieldRow label="Type">
        <div className="flex gap-1">
          {TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                onClick={() => setType(item.id)}
                className={`flex h-8 w-8 items-center justify-center rounded border ${
                  bg.type === item.id
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </BlogInspectorFieldRow>

      {bg.type === 'classic' || bg.type === 'image' || !bg.type ? (
        <BlogInspectorFieldRow label="Color">
          <BlogInspectorColorControl
            value={bg.color}
            fallback={painted}
            showHex
            onPointerDown={() => begin()}
            onPointerUp={finish}
            onChange={(color) => patch({ color, type: bg.type || 'classic' }, true)}
            title="Background color"
          />
        </BlogInspectorFieldRow>
      ) : null}

      {bg.type === 'image' ? (
        <>
          <label className="block text-xs text-slate-700">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Image</span>
            <div className="flex gap-2">
              <input
                value={bg.imageUrl}
                onChange={(e) => patch({ imageUrl: e.target.value }, true)}
                onBlur={finish}
                placeholder="https:// or /img/…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[11px]"
              />
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
                onClick={() => openMediaLibrary((url) => patch({ imageUrl: url, type: 'image' }), 'background')}
              >
                Library
              </button>
            </div>
          </label>
          <BlogInspectorFieldRow label="Size">
            <select
              value={bg.imageSize}
              onChange={(e) => patch({ imageSize: e.target.value as SurfaceImageSize })}
              className="rounded border border-slate-200 px-2 py-1 text-xs"
            >
              {SIZES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </BlogInspectorFieldRow>
        </>
      ) : null}

      {bg.type === 'video' ? (
        <label className="block text-xs text-slate-700">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Video</span>
          <div className="flex gap-2">
            <input
              value={bg.videoUrl}
              onChange={(e) => patch({ videoUrl: e.target.value }, true)}
              onBlur={finish}
              placeholder="https://…mp4"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-[11px]"
            />
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600"
              onClick={() => openMediaLibrary((url) => patch({ videoUrl: url, type: 'video' }), 'background video')}
            >
              Library
            </button>
          </div>
        </label>
      ) : null}

      {bg.type ? (
        <>
          <p className="pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Overlay / filter</p>
          <BlogInspectorFieldRow label="Overlay">
            <BlogInspectorColorControl
              value={bg.overlayColor}
              showHex
              onPointerDown={() => begin()}
              onPointerUp={finish}
              onChange={(overlayColor) =>
                patch({ overlayColor, overlayOpacity: overlayColor ? Math.max(bg.overlayOpacity, 35) : 0 }, true)
              }
              title="Overlay color"
            />
          </BlogInspectorFieldRow>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <span className="w-20 text-[11px] text-slate-600">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={bg.overlayOpacity}
              onPointerDown={onSliderDown}
              onPointerUp={finish}
              onChange={(e) => patch({ overlayOpacity: Number(e.target.value) || 0 }, true)}
              className="flex-1"
            />
            <span className="w-8 font-mono text-[11px]">{bg.overlayOpacity}</span>
          </label>
          <BlogInspectorFieldRow label="Blend">
            <select
              value={bg.blendMode}
              onChange={(e) => patch({ blendMode: e.target.value })}
              className="rounded border border-slate-200 px-2 py-1 text-xs"
            >
              {BLENDS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </BlogInspectorFieldRow>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <span className="w-20 text-[11px] text-slate-600">Blur</span>
            <input
              type="range"
              min={0}
              max={40}
              value={bg.blur}
              onPointerDown={onSliderDown}
              onPointerUp={finish}
              onChange={(e) => patch({ blur: Number(e.target.value) || 0 }, true)}
              className="flex-1"
            />
            <span className="w-8 font-mono text-[11px]">{bg.blur}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <span className="w-20 text-[11px] text-slate-600">Brightness</span>
            <input
              type="range"
              min={0}
              max={200}
              value={bg.brightness}
              onPointerDown={onSliderDown}
              onPointerUp={finish}
              onChange={(e) => patch({ brightness: Number(e.target.value) || 0 }, true)}
              className="flex-1"
            />
            <span className="w-8 font-mono text-[11px]">{bg.brightness}</span>
          </label>
        </>
      ) : (
        <p className="text-[11px] leading-snug text-slate-500">
          Click Color to paint this widget. Image and Video sit behind the copy.
        </p>
      )}
    </BlogInspectorSection>
    </div>
  );
}
