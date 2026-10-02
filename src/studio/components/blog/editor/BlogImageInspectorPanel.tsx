import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import EditorColorSwatchPicker from '../../editor/EditorColorSwatchPicker';
import { EDITOR_BRAND_SWATCHES } from '../../../lib/editor/brandColorPresets';
import { supabase } from '../../../lib/supabase';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import BlogImageEditPanel from '../blocks/BlogImageEditPanel';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { BlogInspectorTabs } from './BlogInspectorTabs';
import { BlogInspectorAdvancedPanel, BlogInspectorAlignment } from './BlogInspectorControls';

function num(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = Number(data[key]);
  return Number.isFinite(v) ? v : fallback;
}

export default function BlogImageInspectorPanel({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();

  const url = String(block.data.url ?? '');
  const alt = String(block.data.alt ?? '');
  const caption = String(block.data.caption ?? '');
  const width = String(block.data.width ?? 'full');
  const align = (['left', 'right'].includes(String(block.data.align)) ? String(block.data.align) : 'center') as
    | 'left'
    | 'center'
    | 'right';
  const link = String(block.data.link ?? '');
  const scale = Math.min(100, Math.max(25, num(block.data as Record<string, unknown>, 'scale', 100)));
  const brightness = num(block.data as Record<string, unknown>, 'brightness', 100);
  const contrast = num(block.data as Record<string, unknown>, 'contrast', 100);
  const saturation = num(block.data as Record<string, unknown>, 'saturation', 100);
  const cropX = num(block.data as Record<string, unknown>, 'cropX', 0);
  const cropY = num(block.data as Record<string, unknown>, 'cropY', 0);
  const cropW = num(block.data as Record<string, unknown>, 'cropW', 100);
  const cropH = num(block.data as Record<string, unknown>, 'cropH', 100);
  const borderRadiusPx = Math.min(64, Math.max(0, num(block.data as Record<string, unknown>, 'borderRadiusPx', 12)));
  const borderWidthPx = Math.min(12, Math.max(0, num(block.data as Record<string, unknown>, 'borderWidthPx', 0)));
  const borderColor = String(block.data.borderColor ?? '#e2e8f0');
  const shadowPreset = String(block.data.shadowPreset ?? 'md');
  const overlayColor = String(block.data.overlayColor ?? '#000000');
  const overlayOpacity = Math.min(95, Math.max(0, num(block.data as Record<string, unknown>, 'overlayOpacity', 0)));
  const overlayBlendMode = String(block.data.overlayBlendMode ?? 'normal');
  const filterPreset = String(block.data.filterPreset ?? 'none');
  const extraBlurPx = Math.min(8, Math.max(0, num(block.data as Record<string, unknown>, 'extraBlurPx', 0)));
  const extraGrayscale = Math.min(100, Math.max(0, num(block.data as Record<string, unknown>, 'extraGrayscale', 0)));
  const hueRotateDeg = Math.max(-180, Math.min(180, num(block.data as Record<string, unknown>, 'hueRotateDeg', 0)));
  const overlayTitle = String(block.data.overlayTitle ?? '');
  const overlaySubtitle = String(block.data.overlaySubtitle ?? '');
  const overlayPlacement = String(block.data.overlayPlacement ?? 'center');
  const overlayTextColor = String(block.data.overlayTextColor ?? '#ffffff');
  const overlayTextShadow = block.data.overlayTextShadow !== false;
  const overlayTitleSize = String(block.data.overlayTitleSize ?? 'lg');
  const hoverEffect = String(block.data.hoverEffect ?? 'none');

  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const patch = useCallback(
    (data: Record<string, unknown>) => updateBlock(block.id, data),
    [block.id, updateBlock],
  );

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
        setUploadErr('Sign in to upload images.');
        return;
      }
      setUploading(true);
      setUploadErr(null);
      try {
        const publicUrl = await uploadLandingMedia(userId, file);
        patch({ url: publicUrl, alt: alt || file.name.replace(/\.[^.]+$/, '') || 'Image' });
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [userId, patch, alt],
  );

  const contentPanel = (
    <div className="space-y-3 p-2.5">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {!url ? (
            <div
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-white p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f?.type.startsWith('image/')) void onPickFile(f);
              }}
            >
              <ImageIcon className="h-7 w-7 text-slate-400" />
              <p className="text-center text-[11px] font-semibold text-slate-600">Drop image here or upload</p>
              <label
                className={`cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-800 ${
                  uploading || !userId ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                {uploading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                  </span>
                ) : (
                  'Choose image'
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || !userId}
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
                onClick={() => openMediaLibrary((u) => patch({ url: u, alt: alt || 'Image' }))}
                className="text-[10px] font-bold uppercase text-brand-blue hover:underline disabled:opacity-40"
              >
                Media library
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <img src={url} alt="" className="h-28 w-full rounded-lg object-cover" />
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setShowEdit((v) => !v)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-700"
                >
                  {showEdit ? 'Hide edits' : 'Edit image'}
                </button>
                <button
                  type="button"
                  onClick={() => openMediaLibrary((u) => patch({ url: u }))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-700"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => patch({ url: '', scale: 100 })}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black uppercase text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          {uploadErr ? <p className="text-xs text-red-600">{uploadErr}</p> : null}
        </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Alt text</label>
              <input
                value={alt}
                onChange={(e) => patch({ alt: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="Describe the image"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Caption</label>
              <input
                value={caption}
                onChange={(e) => patch({ caption: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="Optional caption"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Link URL</label>
              <input
                value={link}
                onChange={(e) => patch({ link: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="https://"
              />
            </div>
          </div>
    </div>
  );

  const stylePanel = (
    <div className="space-y-3 p-2.5">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Image</p>
          <BlogInspectorAlignment value={align} onChange={(v) => patch({ align: v })} />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Width preset</p>
          <div className="flex flex-wrap gap-1">
            {(['small', 'medium', 'wide', 'full'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => patch({ width: w })}
                className={`rounded px-2 py-1 text-xs capitalize transition-colors ${
                  width === w ? 'bg-brand-blue text-brand-yellow' : 'bg-white text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Display size ({scale}%)
            <input
              type="range"
              min={25}
              max={100}
              value={scale}
              onChange={(e) => patch({ scale: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Border & shadow</p>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Border radius ({borderRadiusPx}px)
            <input
              type="range"
              min={0}
              max={64}
              value={borderRadiusPx}
              onChange={(e) => patch({ borderRadiusPx: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Border px
              <input
                type="number"
                min={0}
                max={12}
                value={borderWidthPx}
                onChange={(e) => patch({ borderWidthPx: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Border color
              <div className="mt-1">
                <EditorColorSwatchPicker
                  value={borderColor}
                  onChange={(borderColor) => patch({ borderColor })}
                  swatches={[...EDITOR_BRAND_SWATCHES, '#e2e8f0']}
                  size="sm"
                />
              </div>
            </label>
          </div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Shadow
            <select
              value={shadowPreset}
              onChange={(e) => patch({ shadowPreset: e.target.value })}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="none">None</option>
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">XL</option>
              <option value="inner">Inner</option>
            </select>
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Hover effect
            <select
              value={hoverEffect}
              onChange={(e) => patch({ hoverEffect: e.target.value })}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="none">None</option>
              <option value="zoom">Zoom</option>
              <option value="lift">Lift</option>
            </select>
          </label>
        </div>

        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filters</p>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Preset
            <select
              value={filterPreset}
              onChange={(e) => patch({ filterPreset: e.target.value })}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="none">None</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
              <option value="bw">B&W</option>
              <option value="vivid">Vivid</option>
              <option value="fade">Fade</option>
              <option value="crisp">Crisp</option>
            </select>
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Blur ({extraBlurPx}px)
            <input
              type="range"
              min={0}
              max={8}
              step={0.25}
              value={extraBlurPx}
              onChange={(e) => patch({ extraBlurPx: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Grayscale ({extraGrayscale}%)
            <input
              type="range"
              min={0}
              max={100}
              value={extraGrayscale}
              onChange={(e) => patch({ extraGrayscale: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Hue rotate ({hueRotateDeg}°)
            <input
              type="range"
              min={-180}
              max={180}
              value={hueRotateDeg}
              onChange={(e) => patch({ hueRotateDeg: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
        </div>

        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Overlay text</p>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Title
            <input
              value={overlayTitle}
              onChange={(e) => patch({ overlayTitle: e.target.value })}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="Headline on image"
            />
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Subtitle
            <input
              value={overlaySubtitle}
              onChange={(e) => patch({ overlaySubtitle: e.target.value })}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="Optional subheading"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Placement
              <select
                value={overlayPlacement}
                onChange={(e) => patch({ overlayPlacement: e.target.value })}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="center">Center</option>
                <option value="top-left">Top left</option>
                <option value="top-center">Top center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-center">Bottom center</option>
              </select>
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Title size
              <select
                value={overlayTitleSize}
                onChange={(e) => patch({ overlayTitleSize: e.target.value })}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">XL</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Text color
              <div className="mt-1">
                <EditorColorSwatchPicker
                  value={overlayTextColor}
                  onChange={(overlayTextColor) => patch({ overlayTextColor })}
                  swatches={['#FFFFFF', '#000000', '#fdc20f', '#FFD700', '#072a1b']}
                  size="sm"
                />
              </div>
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Blend mode
              <select
                value={overlayBlendMode}
                onChange={(e) => patch({ overlayBlendMode: e.target.value })}
                className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="overlay">Overlay</option>
                <option value="screen">Screen</option>
                <option value="soft-light">Soft light</option>
              </select>
            </label>
          </div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Overlay opacity ({overlayOpacity}%)
            <input
              type="range"
              min={0}
              max={95}
              value={overlayOpacity}
              onChange={(e) => patch({ overlayOpacity: Number(e.target.value) })}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Overlay color
            <div className="mt-1">
              <EditorColorSwatchPicker
                value={overlayColor}
                onChange={(overlayColor) => patch({ overlayColor })}
                swatches={['#000000', '#072a1b', '#FFFFFF', '#0f172a']}
                size="sm"
              />
            </div>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={overlayTextShadow}
              onChange={(e) => patch({ overlayTextShadow: e.target.checked })}
            />
            Text shadow
          </label>
          <button
            type="button"
            onClick={() =>
              patch({
                borderRadiusPx: 12,
                shadowPreset: 'md',
                borderWidthPx: 0,
                borderColor: '#e2e8f0',
                overlayColor: '#000000',
                overlayOpacity: 0,
                overlayBlendMode: 'normal',
                filterPreset: 'none',
                extraBlurPx: 0,
                extraGrayscale: 0,
                hueRotateDeg: 0,
                overlayTitle: '',
                overlaySubtitle: '',
                overlayPlacement: 'center',
                overlayTextColor: '#ffffff',
                overlayTextShadow: true,
                overlayTitleSize: 'lg',
                hoverEffect: 'none',
              })
            }
            className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
          >
            Reset style
          </button>
        </div>

        {url && showEdit ? (
          <div>
            <BlogImageEditPanel
              url={url}
              userId={userId}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              cropX={cropX}
              cropY={cropY}
              cropW={cropW}
              cropH={cropH}
              onApplied={(next) => {
                patch(next);
                setShowEdit(false);
              }}
            />
          </div>
        ) : null}
    </div>
  );

  const advancedPanel = (
    <div className="p-2.5">
      <BlogInspectorAdvancedPanel blockId={block.id} data={block.data as Record<string, unknown>} onPatch={updateBlock} />
    </div>
  );

  return (
    <aside className="min-w-0 bg-[#04190f]">
      <p className="px-3 pt-3 text-xs font-black uppercase tracking-widest text-white/60">Edit Image</p>
      <div className="rounded-xl border border-white/10 bg-white/95 shadow-sm">
        <BlogInspectorTabs content={contentPanel} style={stylePanel} advanced={advancedPanel} />
      </div>
    </aside>
  );
}
