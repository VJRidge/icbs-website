import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadLandingMedia } from '../../lib/landingEditorUploadShared';
import type { PublicFileSlot } from '../../../lib/site/publicSurfaces';
import {
  DOWNLOAD_MAP_KEY,
  emptyDownloadMapDocument,
  parseDownloadMap,
  type DownloadMapDocument,
} from '../../../lib/site/siteManagedContent';
import { invalidateManagedDownloadCache } from '../../../lib/site/useManagedDownloads';

/** Shared upload/URL map UI for template files or Media site documents. */
export default function SiteFileSlotsPanel({
  slots,
  userId,
  emptyHint,
}: {
  slots: PublicFileSlot[];
  userId: string | null | undefined;
  emptyHint?: string;
}) {
  const [map, setMap] = useState<DownloadMapDocument>(emptyDownloadMapDocument());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('site_managed_content')
      .select('document')
      .eq('key', DOWNLOAD_MAP_KEY)
      .maybeSingle();
    if (loadError) {
      setError(
        loadError.message.includes('site_managed_content')
          ? 'Apply migration 20261035_site_managed_content.sql, then reload.'
          : loadError.message,
      );
      setMap(emptyDownloadMapDocument());
    } else {
      setMap(parseDownloadMap(data?.document ?? emptyDownloadMapDocument()));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: DownloadMapDocument) => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { error: upsertError } = await supabase.from('site_managed_content').upsert({
      key: DOWNLOAD_MAP_KEY,
      kind: 'download_map',
      document: next,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    invalidateManagedDownloadCache();
    setMap(next);
    setNotice('Saved. Public pages pick this up on the next visit.');
  };

  const onUpload = async (key: string, file: File | null) => {
    if (!file || !userId) return;
    setUploadingKey(key);
    setError(null);
    try {
      const url = await uploadLandingMedia(userId, file);
      await save({ urls: { ...map.urls, [key]: url } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {slots.length === 0 ? <p className="text-sm text-slate-500">{emptyHint || 'No slots.'}</p> : null}
      <ul className="space-y-4">
        {slots.map((slot) => {
          const current = map.urls[slot.key] || slot.defaultPath;
          const isOverride = current !== slot.defaultPath;
          return (
            <li key={slot.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{slot.label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{current}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Used on: {slot.usedOn.join(', ')}
                    {isOverride ? ' · custom file' : ' · packaged default'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={current}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
                    disabled={!userId || !!uploadingKey || saving}
                    onClick={() => fileRefs.current[slot.key]?.click()}
                  >
                    <Upload size={12} />
                    {uploadingKey === slot.key ? 'Uploading…' : 'Upload replace'}
                  </button>
                  {isOverride ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700"
                      disabled={saving}
                      onClick={() => void save({ urls: { ...map.urls, [slot.key]: slot.defaultPath } })}
                    >
                      Reset default
                    </button>
                  ) : null}
                </div>
              </div>
              <input
                ref={(el) => {
                  fileRefs.current[slot.key] = el;
                }}
                type="file"
                className="hidden"
                accept={slot.accept}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = '';
                  void onUpload(slot.key, file);
                }}
              />
              <label className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                Or paste media URL
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs normal-case tracking-normal text-slate-800"
                  value={current}
                  onChange={(e) => setMap({ urls: { ...map.urls, [slot.key]: e.target.value } })}
                  onBlur={() => void save(map)}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
