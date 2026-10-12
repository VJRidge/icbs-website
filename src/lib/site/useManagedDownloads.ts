import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../supabaseBrowser';
import { DOWNLOAD_MAP_KEY, parseDownloadMap, resolveDownloadUrl, type DownloadMapDocument } from './siteManagedContent';
import { defaultDownloadMap } from './publicSurfaces';

let cachedMap: DownloadMapDocument | null = null;
let inflight: Promise<DownloadMapDocument> | null = null;

async function loadDownloadMap(): Promise<DownloadMapDocument> {
  if (cachedMap) return cachedMap;
  if (inflight) return inflight;
  inflight = (async () => {
    const fallback = parseDownloadMap({ urls: defaultDownloadMap() });
    const sb = supabaseBrowser();
    if (!sb) {
      cachedMap = fallback;
      return fallback;
    }
    try {
      const { data, error } = await sb
        .from('site_managed_content')
        .select('document')
        .eq('key', DOWNLOAD_MAP_KEY)
        .maybeSingle();
      if (error || !data) {
        cachedMap = fallback;
        return fallback;
      }
      cachedMap = parseDownloadMap(data.document);
      return cachedMap;
    } catch {
      cachedMap = fallback;
      return fallback;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Public pages: resolve a download slot URL (DB override or packaged default). */
export function useManagedDownloadUrl(key: string, fallback: string): string {
  const [url, setUrl] = useState(() => resolveDownloadUrl(cachedMap, key, fallback));

  useEffect(() => {
    let cancelled = false;
    void loadDownloadMap().then((map) => {
      if (!cancelled) setUrl(resolveDownloadUrl(map, key, fallback));
    });
    return () => {
      cancelled = true;
    };
  }, [key, fallback]);

  return url;
}

export function invalidateManagedDownloadCache(): void {
  cachedMap = null;
  inflight = null;
}
