import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../supabaseBrowser';
import type { BookUpdateEntry } from '../../pages/resources/bookUpdates';
import { BOOK_UPDATE_ENTRIES } from '../../pages/resources/bookUpdates';
import { BOOK_UPDATES_KEY, parseBookUpdates } from './siteManagedContent';

/** Public Book Updates page: DB entries when present, else code fallback (usually empty). */
export function useBookUpdates(): { entries: BookUpdateEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<BookUpdateEntry[]>(BOOK_UPDATE_ENTRIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sb = supabaseBrowser();
    if (!sb) {
      setLoading(false);
      return;
    }
    void sb
      .from('site_managed_content')
      .select('document')
      .eq('key', BOOK_UPDATES_KEY)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          const parsed = parseBookUpdates(data.document);
          setEntries(parsed.entries.length ? parsed.entries : BOOK_UPDATE_ENTRIES);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading };
}
