import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Film, ImageIcon, Images, Loader2, Upload, X, Copy, Check } from 'lucide-react';
import { paginateList, totalListPages } from '../lib/admin/cmsListPagination';
import { LANDING_MEDIA_BUCKET } from '../lib/landingPageConfig';
import {
  countLandingMediaByTab,
  filterLandingMediaByTab,
  listLandingMediaFiles,
  type LandingMediaPickerTab,
} from '../lib/landingMediaLibrary';
import LandingMediaFileThumb from './LandingMediaFileThumb';
import { uploadLandingMedia } from '../lib/landingEditorUploadShared';
import { LANDING_MEDIA_UPLOAD_ACCEPT } from '../lib/landingMediaLibrary';
import { assertImageUploadSize, assertVideoUploadSize } from '../lib/social/mediaUploadLimits';

const PICKER_PAGE_SIZE = 12;

type FileRow = { name: string; publicUrl: string; createdAt: string | null };

const TAB_OPTIONS: { id: LandingMediaPickerTab; label: string; icon: typeof Images }[] = [
  { id: 'all', label: 'All', icon: Images },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'gif', label: 'GIF', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'doc', label: 'Docs', icon: FileText },
];

function tabButtonClass(active: boolean): string {
  return `rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-colors ${
    active
      ? 'border-brand-blue bg-brand-blue text-brand-yellow'
      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/30'
  }`;
}

export function LandingMediaPicker({
  open,
  userId,
  onClose,
  onPick,
  title = 'Landing media library',
  subtitle,
  purpose,
  overlayZClass = 'z-[100]',
}: {
  open: boolean;
  userId: string;
  onClose: () => void;
  onPick: (publicUrl: string) => void;
  title?: string;
  subtitle?: string;
  /** Left-panel field this choice fills, so the editor can keep that field in view. */
  purpose?: string;
  /** Overlay stacking (e.g. blog admin toolbar uses z-200+). */
  overlayZClass?: string;
}) {
  const [rows, setRows] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LandingMediaPickerTab>('all');
  const [page, setPage] = useState(1);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const aside = document.querySelector<HTMLElement>('[data-studio-sidebar]');
    if (!aside) return;
    const previous = aside.style.zIndex;
    aside.style.zIndex = '260';
    return () => {
      aside.style.zIndex = previous;
    };
  }, [open]);

  const onUpload = async (files: FileList | null) => {
    const list = files ? Array.from(files) : [];
    if (!list.length || !userId) return;
    setUploading(true);
    setErr(null);
    try {
      let lastUrl = '';
      for (const file of list) {
        const video = file.type.startsWith('video/') || /\.(mp4|webm|mov|mpe?g)$/i.test(file.name);
        if (video) assertVideoUploadSize(file);
        else if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)) assertImageUploadSize(file);
        lastUrl = await uploadLandingMedia(userId, file);
      }
      await load();
      if (lastUrl) onPick(lastUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const list = await listLandingMediaFiles(userId, 500);
      setRows(list.map(({ name, publicUrl, createdAt }) => ({ name, publicUrl, createdAt })));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not list files');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!open || !userId) return;
    void load();
  }, [open, userId, load]);

  useEffect(() => {
    if (!open) {
      setCopiedUrl(null);
      setPreviewVideo(null);
      setActiveTab('all');
      setPage(1);
    }
  }, [open]);

  const tabCounts = useMemo(() => countLandingMediaByTab(rows), [rows]);

  const filtered = useMemo(() => {
    const list = filterLandingMediaByTab(rows, activeTab);
    return [...list].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [rows, activeTab]);

  const totalPages = totalListPages(filtered.length, PICKER_PAGE_SIZE);
  const paged = useMemo(
    () => paginateList(filtered, page, PICKER_PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (!open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 flex items-end justify-center sm:items-center p-3 sm:p-6 bg-black/50 ${overlayZClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-media-picker-title"
        onClick={onClose}
      >
        <div
          data-blog-editor-chrome
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="min-w-0">
              <h2 id="landing-media-picker-title" className="text-sm font-black text-slate-900 tracking-tight">
                {title}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {subtitle ?? `Files in your folder under ${LANDING_MEDIA_BUCKET}. Filter by type below.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-200/80"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept={LANDING_MEDIA_UPLOAD_ACCEPT}
              className="hidden"
              onChange={(e) => void onUpload(e.target.files)}
            />
            <button
              type="button"
              disabled={!userId || uploading}
              onClick={() => fileInputRef.current?.click()}
              title={purpose ? `Upload a file for ${purpose}` : 'Upload a photo, video, or audio file'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F3D13D] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#151412] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {uploading ? 'Uploading' : 'Upload'}
            </button>
            {TAB_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={tabButtonClass(activeTab === id)}
                aria-pressed={activeTab === id}
              >
                <Icon className="h-3 w-3 shrink-0 opacity-80" />
                {label}
                <span className="opacity-70">({tabCounts[id]})</span>
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {!userId ? (
              <p className="text-sm text-amber-800">Sign in to browse uploads.</p>
            ) : loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
              </div>
            ) : err ? (
              <p className="text-sm text-red-700 font-medium">{err}</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-600">
                {rows.length === 0
                  ? 'No files yet. Use Upload on any image, video, or audio field to add to this library.'
                  : `No ${activeTab === 'all' ? '' : `${TAB_OPTIONS.find((t) => t.id === activeTab)?.label ?? activeTab} `}files in this tab.`}
              </p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paged.map((row) => (
                  <li
                    key={row.name}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => onPick(row.publicUrl)}
                      className="relative aspect-square w-full bg-slate-200/80 flex items-center justify-center group outline-none focus-visible:ring-2 focus-visible:ring-brand-blue overflow-hidden"
                    >
                      <LandingMediaFileThumb
                        name={row.name}
                        publicUrl={row.publicUrl}
                        onPreviewVideo={() =>
                          setPreviewVideo({ url: row.publicUrl, name: row.name })
                        }
                      />
                    </button>
                    <div className="p-2 flex flex-col gap-1 border-t border-slate-200 bg-white">
                      <p className="text-[10px] font-mono text-slate-600 truncate" title={row.name}>
                        {row.name}
                      </p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onPick(row.publicUrl)}
                          className="flex-1 rounded-lg bg-brand-blue py-1.5 text-[9px] font-black uppercase tracking-wider text-brand-yellow hover:brightness-105"
                        >
                          Use URL
                        </button>
                        <button
                          type="button"
                          title="Copy URL"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(row.publicUrl);
                              setCopiedUrl(row.publicUrl);
                              window.setTimeout(
                                () => setCopiedUrl((u) => (u === row.publicUrl ? null : u)),
                                2000,
                              );
                            } catch {
                              setCopiedUrl(null);
                            }
                          }}
                          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                          aria-label="Copy URL"
                        >
                          {copiedUrl === row.publicUrl ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {filtered.length > PICKER_PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[10px] font-semibold text-slate-500">
                Page {page} of {totalPages} · {filtered.length} files
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {previewVideo ? (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-black/70 p-4 ${
            overlayZClass.includes('240') ? 'z-[260]' : 'z-[110]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Video preview"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <p className="truncate font-mono text-xs text-slate-700" title={previewVideo.name}>
                {previewVideo.name}
              </p>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video
              src={previewVideo.url}
              controls
              autoPlay
              playsInline
              className="max-h-[70vh] w-full bg-black"
            />
            <div className="flex gap-2 border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => {
                  onPick(previewVideo.url);
                  setPreviewVideo(null);
                }}
                className="flex-1 rounded-lg bg-brand-blue py-2 text-[10px] font-black uppercase tracking-wider text-brand-yellow"
              >
                Use this video
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
