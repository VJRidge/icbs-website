import { useEffect, useState } from 'react';
import { Gift, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Target = 'home' | 'kit';

const TARGETS: Record<Target, { field: 'homepage_content_id' | 'kit_content_id'; label: string; icon: typeof Home }> = {
  home: { field: 'homepage_content_id', label: 'Use as website homepage', icon: Home },
  kit: { field: 'kit_content_id', label: 'Use as kit page (/free)', icon: Gift },
};

function hint(target: Target, pageId: string | null, active: boolean, isPublished: boolean): string {
  if (!pageId) return 'Save the page first.';
  if (target === 'home') {
    return active && !isPublished ? 'Homepage shows the kit until this page is published.' : 'Replaces the homepage at /.';
  }
  if (active && !isPublished) return '/free keeps showing the built-in kit page until this page is published.';
  return active ? '/free now shows this page. Untick to go back to the built-in kit page.' : '/free shows the built-in kit page.';
}

/** Points a `settings` slot (homepage or the /free kit page) at this page. */
export default function HomepageToggle({
  pageId,
  isPublished,
  target = 'home',
}: {
  pageId: string | null;
  isPublished: boolean;
  target?: Target;
}) {
  const { field, label, icon: Icon } = TARGETS[target];
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from('settings')
      .select(field)
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => setCurrentId(((data as Record<string, unknown> | null)?.[field] as string | null) ?? null));
  }, [field]);

  const active = Boolean(pageId) && currentId === pageId;

  const toggle = async () => {
    if (!pageId) return;
    setBusy(true);
    const next = active ? null : pageId;
    const { error } = await supabase.from('settings').update({ [field]: next }).eq('id', 1);
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setCurrentId(next);
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={active} disabled={!pageId || busy} onChange={() => void toggle()} />
        <Icon size={12} className="text-slate-400" />
        {label}
      </label>
      <p className="text-[10px] font-medium leading-snug text-slate-500">{hint(target, pageId, active, isPublished)}</p>
    </div>
  );
}
