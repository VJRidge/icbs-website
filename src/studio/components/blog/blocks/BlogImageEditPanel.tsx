import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Sun } from 'lucide-react';
import {
  cssFilterFromAdjustments,
  DEFAULT_IMAGE_ADJUSTMENTS,
  renderAdjustedImageBlob,
  type ImageAdjustments,
} from '../../../lib/blog/blogImageProcessing';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';

type Props = {
  url: string;
  userId: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  onApplied: (next: {
    url: string;
    brightness: number;
    contrast: number;
    saturation: number;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
  }) => void;
};

export default function BlogImageEditPanel({
  url,
  userId,
  brightness,
  contrast,
  saturation,
  cropX,
  cropY,
  cropW,
  cropH,
  onApplied,
}: Props) {
  const [adj, setAdj] = useState<ImageAdjustments>({ brightness, contrast, saturation });
  const [crop, setCrop] = useState({ x: cropX, y: cropY, w: cropW, h: cropH });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const previewFilter = useMemo(() => cssFilterFromAdjustments(adj), [adj]);

  const applyLive = () => {
    onApplied({
      url,
      brightness: adj.brightness,
      contrast: adj.contrast,
      saturation: adj.saturation,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.w,
      cropH: crop.h,
    });
  };

  const bakeAndUpload = async () => {
    if (!userId) {
      setErr('Sign in to save edited image.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const blob = await renderAdjustedImageBlob(url, adj, crop);
      const file = new File([blob], 'blog-image-edited.jpg', { type: 'image/jpeg' });
      const publicUrl = await uploadLandingMedia(userId, file);
      onApplied({
        url: publicUrl,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        cropX: 0,
        cropY: 0,
        cropW: 100,
        cropH: 100,
      });
      setAdj({ ...DEFAULT_IMAGE_ADJUSTMENTS });
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjust image</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        <img
          src={url}
          alt=""
          className="mx-auto max-h-40 w-auto object-contain"
          style={{
            filter: previewFilter,
            clipPath: `inset(${crop.y}% ${100 - crop.x - crop.w}% ${100 - crop.y - crop.h}% ${crop.x}%)`,
          }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-[10px] font-bold text-slate-600">
          Brighten
          <input
            type="range"
            min={50}
            max={150}
            value={adj.brightness}
            onChange={(e) => setAdj((a) => ({ ...a, brightness: Number(e.target.value) }))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-[10px] font-bold text-slate-600">
          Contrast
          <input
            type="range"
            min={50}
            max={150}
            value={adj.contrast}
            onChange={(e) => setAdj((a) => ({ ...a, contrast: Number(e.target.value) }))}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-[10px] font-bold text-slate-600">
          Saturation
          <input
            type="range"
            min={0}
            max={200}
            value={adj.saturation}
            onChange={(e) => setAdj((a) => ({ ...a, saturation: Number(e.target.value) }))}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crop region (%)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['x', 'y', 'w', 'h'] as const).map((key) => (
          <label key={key} className="text-[10px] font-bold uppercase text-slate-500">
            {key}
            <input
              type="number"
              min={0}
              max={100}
              value={crop[key === 'x' ? 'x' : key === 'y' ? 'y' : key === 'w' ? 'w' : 'h']}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                setCrop((c) => ({ ...c, [key]: v }));
              }}
              className="mt-0.5 w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyLive}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-100"
        >
          <Sun className="h-3.5 w-3.5" /> Preview on block
        </button>
        <button
          type="button"
          disabled={busy || !userId}
          onClick={() => void bakeAndUpload()}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase text-brand-yellow hover:opacity-95 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Bake & save
        </button>
      </div>
      <p className="text-[10px] leading-snug text-slate-500">
        Preview applies filters live. <strong>Bake & save</strong> exports a new JPEG to your media library (use after
        cropping or heavy edits). AI background removal is not built in yet — use an external tool, then re-upload via
        Media library.
      </p>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
