import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { POST_CATEGORY_KIND } from '../../lib/contentKinds';
import {
  toggleAdditionalCategory,
  withPrimaryCategory,
  type CategoryLink,
} from '../../../lib/content/postCategories';

type Category = { id: string; name: string; slug: string };

/** Primary + additional categories; links saved immediately in `content_taxonomies`. */
export default function PostCategoriesPanel({ postId }: { postId: string | null }) {
  const [all, setAll] = useState<Category[]>([]);
  const [links, setLinks] = useState<CategoryLink[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from('taxonomies')
      .select('id, name, slug')
      .eq('kind', POST_CATEGORY_KIND)
      .order('sort_order')
      .order('name')
      .then(({ data }) => setAll((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (!postId) {
      setLinks([]);
      return;
    }
    void supabase
      .from('content_taxonomies')
      .select('taxonomy_id, is_primary')
      .eq('content_id', postId)
      .then(({ data }) => {
        const next = ((data as { taxonomy_id: string; is_primary?: boolean }[]) ?? []).map((r) => ({
          taxonomyId: String(r.taxonomy_id),
          isPrimary: Boolean(r.is_primary),
        }));
        setLinks(next);
      });
  }, [postId]);

  const persist = async (next: CategoryLink[]) => {
    if (!postId) return;
    const previous = links;
    setBusy(true);
    // Clear primary first so the unique partial index never conflicts mid-write.
    const { error: clearError } = await supabase
      .from('content_taxonomies')
      .update({ is_primary: false })
      .eq('content_id', postId);
    if (clearError) {
      setBusy(false);
      window.alert(clearError.message);
      return;
    }

    const keep = new Set(next.map((l) => l.taxonomyId));
    for (const prev of previous) {
      if (keep.has(prev.taxonomyId)) continue;
      const { error } = await supabase
        .from('content_taxonomies')
        .delete()
        .eq('content_id', postId)
        .eq('taxonomy_id', prev.taxonomyId);
      if (error) {
        setBusy(false);
        window.alert(error.message);
        return;
      }
    }

    for (const link of next) {
      const { error } = await supabase.from('content_taxonomies').upsert({
        content_id: postId,
        taxonomy_id: link.taxonomyId,
        is_primary: link.isPrimary,
      });
      if (error) {
        setBusy(false);
        window.alert(error.message);
        return;
      }
    }

    setBusy(false);
    setLinks(next);
  };

  const primaryId = links.find((l) => l.isPrimary)?.taxonomyId ?? '';

  const onPrimary = (id: string) => {
    void persist(withPrimaryCategory(links, id || null));
  };

  const onToggleAdditional = (id: string, on: boolean) => {
    if (id === primaryId && !on) return;
    void persist(toggleAdditionalCategory(links, id, on));
  };

  return (
    <div className="space-y-3">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Tag size={11} /> Categories
      </span>
      {!postId ? (
        <p className="text-[10px] text-slate-500">Save the post first, then pick categories.</p>
      ) : null}

      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Primary
        <select
          disabled={!postId || busy}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold normal-case tracking-normal text-slate-800 disabled:opacity-40"
          value={primaryId}
          onChange={(e) => onPrimary(e.target.value)}
        >
          <option value="">None</option>
          {all.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Additional</p>
        {all.length === 0 ? <p className="text-[10px] text-slate-400">No categories yet.</p> : null}
        {all.map((c) => {
          const checked = links.some((l) => l.taxonomyId === c.id);
          const isPrimary = c.id === primaryId;
          return (
            <label key={c.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={checked}
                disabled={!postId || busy || isPrimary}
                onChange={(e) => onToggleAdditional(c.id, e.target.checked)}
              />
              {c.name}
              {isPrimary ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  primary
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        Manage categories under Content → Categories. Tags stay separate for finer detail.
      </p>
    </div>
  );
}
