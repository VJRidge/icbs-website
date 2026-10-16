import { useEffect, useMemo, useRef, useState } from 'react';
import { Crop, FlipHorizontal, FlipVertical, Redo2, RotateCcw, RotateCw, Scaling, Undo2, X } from 'lucide-react';
import { applyImageEditOps, canvasToBlob, mimeFromFileName } from '../../lib/media/applyImageEditOps';
import {
  clampCrop,
  commitEdit,
  cropBoxForAspect,
  emptyHistory,
  redoEdit,
  scaleFromHeight,
  scaleFromWidth,
  sizeAfterOps,
  undoEdit,
  type ImageEditOp,
} from '../../lib/media/imageEditOps';
import { loadEditableImage } from '../../lib/media/loadEditableImage';
import { overwriteLandingMedia } from '../../lib/media/overwriteLandingMedia';
import { MediaCropOverlay } from './MediaCropOverlay';

type Tool = 'crop' | 'scale' | null;

export function MediaImageEditor({
  userId,
  fileName,
  publicUrl,
  storagePath,
  onClose,
  onSaved,
}: {
  userId: string;
  fileName: string;
  publicUrl: string;
  storagePath: string;
  onClose: () => void;
  onSaved: (nextUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState(emptyHistory);
  const [tool, setTool] = useState<Tool>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [scaleW, setScaleW] = useState(1);
  const [scaleH, setScaleH] = useState(1);
  const [aspectW, setAspectW] = useState('');
  const [aspectH, setAspectH] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 });

  const liveSize = useMemo(() => sizeAfterOps(natural, history.present), [natural, history.present]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const image = await loadEditableImage(publicUrl);
        if (cancelled) return;
        sourceRef.current = image;
        const size = { width: image.naturalWidth, height: image.naturalHeight };
        setNatural(size);
        setScaleW(size.width);
        setScaleH(size.height);
        setCrop({ x: 0, y: 0, width: size.width, height: size.height });
        setHistory(emptyHistory());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open this image.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicUrl]);

  useEffect(() => {
    const source = sourceRef.current;
    const target = canvasRef.current;
    if (!source || !target) return;
    try {
      const next = applyImageEditOps(source, history.present);
      target.width = next.width;
      target.height = next.height;
      const ctx = target.getContext('2d');
      ctx?.drawImage(next, 0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not preview edits.');
    }
  }, [history.present, loading]);

  useEffect(() => {
    setScaleW(liveSize.width);
    setScaleH(liveSize.height);
    setCrop({ x: 0, y: 0, width: liveSize.width, height: liveSize.height });
  }, [liveSize.width, liveSize.height]);

  const applyOp = (op: ImageEditOp) => {
    setHistory((h) => commitEdit(h, op));
    setRotateOpen(false);
  };

  const onSave = async () => {
    const source = sourceRef.current;
    if (!source || history.present.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const canvas = applyImageEditOps(source, history.present);
      const mime = mimeFromFileName(fileName);
      const blob = await canvasToBlob(canvas, mime);
      const nextUrl = await overwriteLandingMedia(userId, storagePath, blob, mime);
      onSaved(nextUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save edits.');
    } finally {
      setSaving(false);
    }
  };

  const applyScale = () => {
    if (scaleW === liveSize.width && scaleH === liveSize.height) return;
    applyOp({ type: 'scale', width: Math.max(1, Math.round(scaleW)), height: Math.max(1, Math.round(scaleH)) });
  };

  const applyCrop = () => {
    const next = clampCrop(crop, liveSize);
    if (next.x === 0 && next.y === 0 && next.width === liveSize.width && next.height === liveSize.height) return;
    applyOp({ type: 'crop', ...next });
  };

  const onAspectBlur = () => {
    const w = Number(aspectW);
    const h = Number(aspectH);
    if (!(w > 0) || !(h > 0)) return;
    setCrop(cropBoxForAspect(liveSize, w, h));
  };

  const toolClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
      active
        ? 'border-brand-blue bg-brand-blue text-brand-yellow'
        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-blue/40'
    }`;

  return (
    <div className="fixed inset-0 z-[280] flex items-stretch bg-white" role="dialog" aria-modal="true" aria-labelledby="media-image-editor-title">
      <div className="flex min-h-0 w-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 id="media-image-editor-title" className="text-lg font-black text-slate-900">
            Attachment details
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
          <button type="button" className={toolClass(tool === 'crop')} onClick={() => setTool((t) => (t === 'crop' ? null : 'crop'))}>
            <Crop size={14} /> Crop
          </button>
          <button type="button" className={toolClass(tool === 'scale')} onClick={() => setTool((t) => (t === 'scale' ? null : 'scale'))}>
            <Scaling size={14} /> Scale
          </button>
          <div className="relative">
            <button type="button" className={toolClass(rotateOpen)} onClick={() => setRotateOpen((o) => !o)}>
              <RotateCw size={14} /> Image rotation
            </button>
            {rotateOpen ? (
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => applyOp({ type: 'rotate', quarterTurns: 3 })}>
                  <RotateCcw size={14} /> Rotate 90° left
                </button>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => applyOp({ type: 'rotate', quarterTurns: 1 })}>
                  <RotateCw size={14} /> Rotate 90° right
                </button>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => applyOp({ type: 'rotate', quarterTurns: 2 })}>
                  Rotate 180°
                </button>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => applyOp({ type: 'flip', axis: 'vertical' })}>
                  <FlipVertical size={14} /> Flip vertical
                </button>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50" onClick={() => applyOp({ type: 'flip', axis: 'horizontal' })}>
                  <FlipHorizontal size={14} /> Flip horizontal
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" disabled={history.past.length === 0} className={`${toolClass(false)} disabled:opacity-40`} onClick={() => setHistory(undoEdit)}>
            <Undo2 size={14} /> Undo
          </button>
          <button type="button" disabled={history.future.length === 0} className={`${toolClass(false)} disabled:opacity-40`} onClick={() => setHistory(redoEdit)}>
            <Redo2 size={14} /> Redo
          </button>
          <button type="button" className={toolClass(false)} onClick={onClose}>
            Cancel editing
          </button>
          <button
            type="button"
            disabled={saving || history.present.length === 0}
            onClick={() => void onSave()}
            className="inline-flex items-center rounded-lg bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save edits'}
          </button>
        </div>
        {error ? <p className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-h-0 overflow-auto bg-[linear-gradient(45deg,#d9d9d9_25%,transparent_25%,transparent_75%,#d9d9d9_75%),linear-gradient(45deg,#d9d9d9_25%,#fff_25%,#fff_75%,#d9d9d9_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4">
            {loading ? (
              <p className="text-sm font-semibold text-slate-600">Loading image…</p>
            ) : (
              <div className="relative inline-block max-w-full">
                <canvas ref={canvasRef} className="block max-h-[70vh] max-w-full" />
                {tool === 'crop' && !loading ? (
                  <MediaCropOverlay imageSize={liveSize} selection={crop} onChange={setCrop} />
                ) : null}
              </div>
            )}
          </div>
          <aside className="overflow-auto border-t border-slate-200 p-4 lg:border-l lg:border-t-0">
            {tool === 'scale' || tool === 'crop' ? (
              <section className="mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scale image</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Original dimensions {natural.width} × {natural.height}
                </p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">New dimensions</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={scaleW}
                    onChange={(e) => {
                      const width = Number(e.target.value);
                      const next = scaleFromWidth(liveSize, width);
                      setScaleW(next.width);
                      setScaleH(next.height);
                    }}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Width"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min={1}
                    value={scaleH}
                    onChange={(e) => {
                      const height = Number(e.target.value);
                      const next = scaleFromHeight(liveSize, height);
                      setScaleW(next.width);
                      setScaleH(next.height);
                    }}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Height"
                  />
                  <button type="button" onClick={applyScale} className="rounded-lg bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow">
                    Scale
                  </button>
                </div>
              </section>
            ) : null}
            {tool === 'crop' ? (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Crop image</h3>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Aspect ratio</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={aspectW}
                    onChange={(e) => setAspectW(e.target.value)}
                    onBlur={onAspectBlur}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Aspect width"
                  />
                  <span className="text-slate-400">:</span>
                  <input
                    value={aspectH}
                    onChange={(e) => setAspectH(e.target.value)}
                    onBlur={onAspectBlur}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Aspect height"
                  />
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Selection</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={crop.width}
                    onChange={(e) => setCrop((c) => clampCrop({ ...c, width: Number(e.target.value) }, liveSize))}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Crop width"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min={1}
                    value={crop.height}
                    onChange={(e) => setCrop((c) => clampCrop({ ...c, height: Number(e.target.value) }, liveSize))}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Crop height"
                  />
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">Starting coordinates</p>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={crop.x}
                    onChange={(e) => setCrop((c) => clampCrop({ ...c, x: Number(e.target.value) }, liveSize))}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Crop X"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min={0}
                    value={crop.y}
                    onChange={(e) => setCrop((c) => clampCrop({ ...c, y: Number(e.target.value) }, liveSize))}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    aria-label="Crop Y"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={applyCrop} className="rounded-lg bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow">
                    Apply crop
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrop({ x: 0, y: 0, width: liveSize.width, height: liveSize.height })}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600"
                  >
                    Clear crop
                  </button>
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
