import { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/** Points `settings.homepage_content_id` at this page; `/free` always stays the kit. */
export default function HomepageToggle({ pageId, isPublished }: { pageId: string | null; isPublished: boolean }) {
  const [homeId, setHomeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from('settings')
      .select('homepage_content_id')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setHomeId((data?.homepage_content_id as string | null) ?? null));
  }, []);

  const isHome = Boolean(pageId) && homeId === pageId;

  const toggle = async () => {
    if (!pageId) return;
    setBusy(true);
    const next = isHome ? null : pageId;
    const { error } = await supabase.from('settings').update({ homepage_content_id: next }).eq('id', 1);
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setHomeId(next);
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={isHome} disabled={!pageId || busy} onChange={() => void toggle()} />
        <Home size={12} className="text-slate-400" />
        Use as website homepage
      </label>
      <p className="text-[10px] font-medium leading-snug text-slate-500">
        {!pageId
          ? 'Save the page first.'
          : isHome && !isPublished
            ? 'Homepage shows the kit until this page is published.'
            : 'The kit at /free never changes.'}
      </p>
    </div>
  );
}
