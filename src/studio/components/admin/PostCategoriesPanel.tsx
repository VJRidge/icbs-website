import { useEffect, useState } from 'react';
import { Plus, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { slugifyTitle } from '../../lib/slugifyTitle';
import { POST_CATEGORY_KIND } from '../../lib/contentKinds';

type Category = { id: string; name: string; slug: string };

/** Category checkboxes for a post; links are saved immediately in `content_taxonomies`. */
export default function PostCategoriesPanel({ postId }: { postId: string | null }) {
  const [all, setAll] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from('taxonomies')
      .select('id, name, slug')
      .eq('kind', POST_CATEGORY_KIND)
      .order('name')
      .then(({ data }) => setAll((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (!postId) {
      setSelected(new Set());
      return;
    }
    void supabase
      .from('content_taxonomies')
      .select('taxonomy_id')
      .eq('content_id', postId)
      .then(({ data }) => setSelected(new Set((data ?? []).map((r) => String(r.taxonomy_id)))));
  }, [postId]);

  const toggle = async (id: string) => {
    if (!postId) return;
    const on = selected.has(id);
    setBusy(true);
    const { error } = on
      ? await supabase.from('content_taxonomies').delete().eq('content_id', postId).eq('taxonomy_id', id)
      : await supabase.from('content_taxonomies').insert({ content_id: postId, taxonomy_id: id });
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('taxonomies')
      .insert({ kind: POST_CATEGORY_KIND, name, slug: slugifyTitle(name) })
      .select('id, name, slug')
      .single();
    setBusy(false);
    if (error || !data) {
      window.alert(error?.code === '23505' ? 'That category already exists.' : (error?.message ?? 'Could not add category.'));
      return;
    }
    const cat = data as Category;
    setAll((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    if (postId) await toggle(cat.id);
  };

  return (
    <div className="space-y-2">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <Tag size={11} /> Categories
      </span>
      {!postId ? <p className="text-[10px] text-slate-500">Save the post first, then pick categories.</p> : null}
      <div className="space-y-1">
        {all.length === 0 ? <p className="text-[10px] text-slate-400">No categories yet.</p> : null}
        {all.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={selected.has(c.id)} disabled={!postId || busy} onChange={() => void toggle(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="New category…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-blue/40"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy || !newName.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-brand-blue/30 disabled:opacity-40"
        >
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  );
}
