import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react';
import { CheckCircle2, Images, Loader2, XCircle } from 'lucide-react';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';

type UploadRow = {
  id: string;
  name: string;
  state: 'pending' | 'uploading' | 'ok' | 'fail';
  error?: string;
};

type Props = {
  userId: string | null;
  accept: string;
  /** Successful uploads only, in original file order (failed files omitted). */
  onUploadedUrls: (urls: string[]) => void;
  label?: string;
};

function shortName(name: string, max = 36): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

export default function BlogBlockMediaDropZone({ userId, accept, onUploadedUrls, label = 'Drop files or add many' }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<UploadRow[] | null>(null);
  const [batchErr, setBatchErr] = useState<string | null>(null);

  const inFlight = Boolean(rows?.some((r) => r.state === 'pending' || r.state === 'uploading'));
  const disabled = !userId || inFlight;

  const runUploads = useCallback(
    async (files: File[]) => {
      if (!userId || !files.length) {
        if (!userId) setBatchErr('Sign in to upload.');
        return;
      }
      setBatchErr(null);
      const initial: UploadRow[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        name: f.name,
        state: 'pending',
      }));
      setRows(initial);

      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setRows((prev) =>
          (prev ?? []).map((r, j) => (j === i ? { ...r, state: 'uploading' as const } : r)),
        );
        try {
          const publicUrl = await uploadLandingMedia(userId, file);
          urls.push(publicUrl);
          setRows((prev) => (prev ?? []).map((r, j) => (j === i ? { ...r, state: 'ok' as const } : r)));
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Upload failed';
          setRows((prev) =>
            (prev ?? []).map((r, j) => (j === i ? { ...r, state: 'fail' as const, error: msg } : r)),
          );
        }
      }

      if (urls.length) onUploadedUrls(urls);
      window.setTimeout(() => setRows(null), urls.length ? 2200 : 4500);
    },
    [userId, onUploadedUrls],
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    void runUploads(list);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    void runUploads(Array.from(dt.files));
  };

  return (
    <div className="space-y-2">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed px-3 py-3 text-xs transition-colors ${
          dragOver ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200 bg-slate-50/80'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <Images className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-semibold text-slate-600">{label}</span>
        <label
          className={`ml-auto shrink-0 cursor-pointer rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-slate-800 ${
            disabled ? 'pointer-events-none' : ''
          }`}
        >
          Choose files
          <input type="file" accept={accept} multiple className="hidden" disabled={disabled} onChange={onInputChange} />
        </label>
        {batchErr ? <p className="w-full text-[11px] text-red-600">{batchErr}</p> : null}
      </div>

      {rows?.length ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md bg-slate-50 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700" title={r.name}>
                  {shortName(r.name)}
                </span>
                {r.state === 'pending' ? <span className="shrink-0 text-[10px] font-bold text-slate-400">Queued</span> : null}
                {r.state === 'uploading' ? (
                  <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-brand-blue">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading
                  </span>
                ) : null}
                {r.state === 'ok' ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </span>
                ) : null}
                {r.state === 'fail' ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-red-600" title={r.error}>
                    <XCircle className="h-3.5 w-3.5" />
                    Failed
                  </span>
                ) : null}
              </div>
              {r.state === 'uploading' ? (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="animate-blog-upload-indeterminate h-full w-1/3 rounded-full bg-brand-blue" />
                </div>
              ) : null}
              {r.state === 'fail' && r.error ? <p className="mt-1 text-[10px] leading-snug text-red-600">{r.error}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
