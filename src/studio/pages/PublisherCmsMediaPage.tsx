import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, Copy, Crop, ExternalLink, File, FileText, Images, Loader2, Music, Search, Trash2, Upload, Video } from 'lucide-react';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CMS_LIST_PAGE_SIZE, paginateList, totalListPages } from '../lib/admin/cmsListPagination';
import { uploadLandingMedia } from '../lib/landingEditorUploadShared';
import {
  compareLandingMediaRows,
  deleteLandingMediaFile,
  getLandingMediaFileKind,
  isProbablyAudio,
  isProbablyDoc,
  isProbablyImage,
  isProbablyRasterImage,
  isProbablyVideo,
  LANDING_MEDIA_UPLOAD_ACCEPT,
  listLandingMediaFiles,
  type LandingMediaFileKind,
  type LandingMediaFileRow,
} from '../lib/landingMediaLibrary';
import { LANDING_MEDIA_BUCKET } from '../lib/landingPageConfig';
import { clipboardCopy } from '../lib/clipboardCopy';
import { supabase } from '../lib/supabase';
import { DOWNLOAD_MAP_KEY } from '../../lib/site/siteManagedContent';
import { parseDownloadMapDocument, sitePackagedMediaRows } from '../../lib/site/siteMediaRows';
import { collectDroppedFiles, filesFromFileList } from '../lib/media/mediaDropFiles';
import { assertImageUploadSize, assertVideoUploadSize } from '../lib/social/mediaUploadLimits';
import { MediaImageEditor } from '../components/media/MediaImageEditor';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import CmsListPagination from '../components/admin/CmsListPagination';
import type { UserProfile } from '../types';

type MediaTypeFilter = 'all' | LandingMediaFileKind;
type MediaSortMode = 'date' | 'name' | 'type';

const TYPE_FILTER_OPTIONS: { id: MediaTypeFilter; label: string; icon: typeof Images }[] = [
  { id: 'all', label: 'All', icon: Images },
  { id: 'image', label: 'Images', icon: Images },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'doc', label: 'Docs', icon: FileText },
  { id: 'other', label: 'Other', icon: File },
];

const SORT_OPTIONS: { id: MediaSortMode; label: string }[] = [
  { id: 'date', label: 'Newest' },
  { id: 'name', label: 'A–Z' },
  { id: 'type', label: 'Type' },
];

function filterButtonClass(isActive: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
    isActive
      ? 'border-brand-blue bg-brand-blue text-brand-yellow'
      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/30 hover:text-brand-blue'
  }`;
}

export default function PublisherCmsMediaPage({ userProfile }: { userProfile: UserProfile | null }) {
  const userId = userProfile?.id ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LandingMediaFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>('all');
  const [sortMode, setSortMode] = useState<MediaSortMode>('date');
  const [page, setPage] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<LandingMediaFileRow | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, mapRes] = await Promise.all([
        listLandingMediaFiles(userId),
        supabase.from('site_managed_content').select('document').eq('key', DOWNLOAD_MAP_KEY).maybeSingle(),
      ]);
      const map = parseDownloadMapDocument(mapRes.data?.document);
      const siteRows: LandingMediaFileRow[] = sitePackagedMediaRows(map).map((r) => ({
        name: r.name,
        publicUrl: r.publicUrl,
        storagePath: r.storagePath,
        createdAt: r.createdAt,
        origin: 'site',
        label: r.label,
      }));
      const libraryRows = list.map((r) => ({ ...r, origin: 'library' as const }));
      // Site packaged docs first so Docs is never empty when public/downloads files exist.
      setRows([...siteRows, ...libraryRows]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load media library.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void load();
  }, [userProfile, load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = rows;
    if (typeFilter !== 'all') {
      list = list.filter((r) => getLandingMediaFileKind(r.name) === typeFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.label && r.label.toLowerCase().includes(q)) ||
          r.publicUrl.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => compareLandingMediaRows(a, b, sortMode));
  }, [rows, searchQuery, typeFilter, sortMode]);

  const totalPages = totalListPages(filtered.length);
  const paged = useMemo(() => paginateList(filtered, page), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortMode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onUpload = async (incoming: FileList | File[] | null) => {
    const files = filesFromFileList(incoming);
    if (!files.length || !userId) return;
    setUploading(true);
    setError(null);
    const failed: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setUploadProgress(`Uploading ${i + 1} of ${files.length}`);
        try {
          const video = file.type.startsWith('video/') || /\.(mp4|webm|mov|mpe?g)$/i.test(file.name);
          if (video) assertVideoUploadSize(file);
          else if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(file.name)) {
            assertImageUploadSize(file);
          }
          await uploadLandingMedia(userId, file);
        } catch (e) {
          failed.push(`${file.name}: ${e instanceof Error ? e.message : 'Upload failed.'}`);
        }
      }
      await load();
      if (failed.length) setError(failed.join(' '));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDelete = async (row: LandingMediaFileRow) => {
    if (row.origin === 'site' || row.storagePath.startsWith('site:')) {
      window.alert(
        'This file ships with the site under /downloads. Upload a replacement into the library if you need a new version, then point the public Templates page at that media URL from Admin → Templates (for Markdown) or by updating the live link.',
      );
      return;
    }
    if (!window.confirm(`Delete "${row.name}" from the media library?`)) return;
    try {
      await deleteLandingMediaFile(row.storagePath);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Could not delete file.');
    }
  };

  const copyUrl = async (url: string) => {
    const ok = await clipboardCopy(url);
    if (ok) {
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl((u) => (u === url ? null : u)), 2000);
    }
  };

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
        <p className="max-w-md text-center font-semibold text-slate-700">Administrator access required.</p>
        <Link to="/" className="mt-6 text-xs font-black uppercase tracking-widest text-brand-blue hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        void collectDroppedFiles(event.dataTransfer).then((files) => void onUpload(files));
      }}
    >
      {dragOver ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-brand-blue/15">
          <div className="rounded-2xl border-2 border-dashed border-brand-blue bg-white px-8 py-6 text-sm font-black uppercase tracking-widest text-brand-blue shadow-lg">
            Drop files to upload
          </div>
        </div>
      ) : null}
    <AdminCmsShell
      title="Media"
      titleIcon={<Images size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
      headerExtra={
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={LANDING_MEDIA_UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => void onUpload(e.target.files)}
          />
          <button
            type="button"
            disabled={!userId || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-blue transition-colors hover:bg-brand-yellow/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploadProgress ?? 'Upload files'}
          </button>
        </>
      }
    >
      <div className="relative mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Media library</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          Drag files or a folder from your desktop, or use Upload files for bulk add. Uploads live in{' '}
          <span className="font-mono text-brand-blue">{LANDING_MEDIA_BUCKET}</span>. Site PDFs and
          template Markdown that already ship under <span className="font-mono text-brand-blue">/downloads</span> also
          appear under <span className="font-semibold text-slate-800">Docs</span> (labeled Site). Use{' '}
          <Link to="/admin/templates" className="font-semibold text-brand-blue hover:underline">
            Templates
          </Link>{' '}
          to replace starter Markdown files.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search filename"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-blue/40"
                aria-label="Search media"
              />
            </div>
            <label className="flex shrink-0 flex-col gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Sort
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as MediaSortMode)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-brand-blue/40"
                aria-label="Sort media files"
              >
                {SORT_OPTIONS.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="shrink-0 pb-2.5 text-xs font-medium text-slate-500">
              {filtered.length} file{filtered.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Type</span>
            {TYPE_FILTER_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTypeFilter(id)}
                className={filterButtonClass(typeFilter === id)}
                aria-pressed={typeFilter === id}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
            </div>
          ) : paged.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Images className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {rows.length === 0
                  ? 'No uploads yet'
                  : typeFilter !== 'all' || searchQuery.trim()
                    ? 'No files match your filters'
                    : 'No files match your search'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Upload from here, or drop media into a post while editing.
              </p>
              {rows.length === 0 ? (
                <button
                  type="button"
                  disabled={!userId || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
                >
                  <Upload size={14} />
                  Upload files
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
              {paged.map((row) => (
                <li key={row.storagePath} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
                  <div className="relative aspect-square w-full bg-slate-200/80">
                    {isProbablyImage(row.name) ? (
                      row.origin !== 'site' && isProbablyRasterImage(row.name) ? (
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          className="h-full w-full"
                          title="Edit image"
                        >
                          <img
                            src={`${row.publicUrl}${row.createdAt ? `?t=${new Date(row.createdAt).getTime()}` : ''}`}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ) : (
                        <img
                          src={`${row.publicUrl}${row.createdAt ? `?t=${new Date(row.createdAt).getTime()}` : ''}`}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )
                    ) : isProbablyVideo(row.name) ? (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-600">
                        Video
                      </div>
                    ) : isProbablyAudio(row.name) ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
                        <Music size={20} className="text-brand-blue" />
                        <audio
                          src={row.publicUrl}
                          controls
                          preload="none"
                          className="h-8 w-full max-w-full"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : isProbablyDoc(row.name) ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
                        <FileText size={28} className="text-brand-blue" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                          {/\.pdf$/i.test(row.name) ? 'PDF' : 'Doc'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-bold text-slate-500 break-all">
                        {row.name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 border-t border-slate-200 bg-white p-2.5">
                    <p className="truncate text-[11px] font-semibold text-slate-800" title={row.label || row.name}>
                      {row.label || row.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-slate-500" title={row.name}>
                      {row.name}
                    </p>
                    {row.origin === 'site' ? (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Site · /downloads</p>
                    ) : row.createdAt ? (
                      <p className="text-[10px] text-slate-400">{format(new Date(row.createdAt), 'MMM d, yyyy')}</p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => void copyUrl(row.publicUrl)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                      >
                        {copiedUrl === row.publicUrl ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        Copy
                      </button>
                      <a
                        href={row.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                        title="Open file"
                      >
                        <ExternalLink size={12} />
                      </a>
                      {row.origin !== 'site' && isProbablyRasterImage(row.name) ? (
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-50"
                          title="Edit image"
                        >
                          <Crop size={12} />
                        </button>
                      ) : null}
                      {row.origin !== 'site' ? (
                        <button
                          type="button"
                          onClick={() => void onDelete(row)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <CmsListPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={CMS_LIST_PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="files"
          />
        </div>
      </div>
      {editing && userId ? (
        <MediaImageEditor
          userId={userId}
          fileName={editing.name}
          publicUrl={editing.publicUrl}
          storagePath={editing.storagePath}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}
    </AdminCmsShell>
    </div>
  );
}
