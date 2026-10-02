import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, Copy, ExternalLink, File, Images, Loader2, Music, Search, Trash2, Upload, Video } from 'lucide-react';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CMS_LIST_PAGE_SIZE, paginateList, totalListPages } from '../lib/admin/cmsListPagination';
import { uploadLandingMedia } from '../lib/landingEditorUploadShared';
import {
  compareLandingMediaRows,
  deleteLandingMediaFile,
  getLandingMediaFileKind,
  isProbablyAudio,
  isProbablyImage,
  isProbablyVideo,
  LANDING_MEDIA_UPLOAD_ACCEPT,
  listLandingMediaFiles,
  type LandingMediaFileKind,
  type LandingMediaFileRow,
} from '../lib/landingMediaLibrary';
import { LANDING_MEDIA_BUCKET } from '../lib/landingPageConfig';
import { clipboardCopy } from '../lib/clipboardCopy';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import CmsListPagination from '../components/admin/CmsListPagination';
import type { UserProfile } from '../types';

type MediaTypeFilter = 'all' | LandingMediaFileKind;
type MediaSortMode = 'date' | 'type';

const TYPE_FILTER_OPTIONS: { id: MediaTypeFilter; label: string; icon: typeof Images }[] = [
  { id: 'all', label: 'All', icon: Images },
  { id: 'image', label: 'Images', icon: Images },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'other', label: 'Other', icon: File },
];

const SORT_OPTIONS: { id: MediaSortMode; label: string }[] = [
  { id: 'date', label: 'Newest' },
  { id: 'type', label: 'File type' },
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

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listLandingMediaFiles(userId);
      setRows(list);
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
      list = list.filter((r) => r.name.toLowerCase().includes(q));
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

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || !userId) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadLandingMedia(userId, file);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDelete = async (row: LandingMediaFileRow) => {
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
            Upload
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">Media library</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          Images, videos, and audio for posts, pages, and landing content. Files live in{' '}
          <span className="font-mono text-brand-blue">{LANDING_MEDIA_BUCKET}</span> under your account folder — the
          same library used in the post editor’s “Insert from media library” picker.
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
            <p className="text-xs font-medium text-slate-500">
              {filtered.length} file{filtered.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sort</span>
              {SORT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSortMode(id)}
                  className={filterButtonClass(sortMode === id)}
                  aria-pressed={sortMode === id}
                >
                  {label}
                </button>
              ))}
            </div>
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
                      <img
                        src={row.publicUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
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
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-bold text-slate-500 break-all">
                        {row.name}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 border-t border-slate-200 bg-white p-2.5">
                    <p className="truncate font-mono text-[10px] text-slate-600" title={row.name}>
                      {row.name}
                    </p>
                    {row.createdAt ? (
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
                      <button
                        type="button"
                        onClick={() => void onDelete(row)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
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
    </AdminCmsShell>
  );
}
