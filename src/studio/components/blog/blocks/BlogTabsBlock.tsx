import { useMemo, useState } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';

type TabRow = { label: string; html: string };

function normalizeTabs(block: BlogBlock): TabRow[] {
  const raw = Array.isArray(block.data.tabs) ? block.data.tabs : [];
  return raw.map((t: unknown) => {
    const o = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
    return {
      label: String(o.label ?? 'Tab'),
      html: typeof o.html === 'string' ? o.html : '',
    };
  });
}

export default function BlogTabsBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const tabs = useMemo(() => normalizeTabs(block), [block]);
  const [active, setActive] = useState(0);
  const safeActive = Math.min(Math.max(active, 0), Math.max(tabs.length - 1, 0));

  const setTabs = (next: TabRow[]) => updateBlock(block.id, { tabs: next });

  if (!isEditing) {
    if (!tabs.length) return null;
    const cur = tabs[safeActive];
    return (
      <section className="my-6 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2 pt-2">
          {tabs.map((t, i) => (
            <button
              key={`tab-${i}-${t.label}`}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                safeActive === i ? 'bg-brand-blue text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label || `Tab ${i + 1}`}
            </button>
          ))}
        </div>
        <div
          className="prose prose-slate max-w-none px-4 py-4 prose-headings:font-black prose-headings:text-brand-blue"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogBlockHtml(cur?.html || '<p></p>') || '<p></p>' }}
        />
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          onClick={() =>
            setTabs([...tabs, { label: `Tab ${tabs.length + 1}`, html: '<p></p>' }])
          }
        >
          Add tab
        </button>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-50 p-1">
        {tabs.map((t, i) => (
          <button
            key={`tab-edit-${block.id}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              safeActive === i ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            {t.label?.slice(0, 18) || `Tab ${i + 1}`}
          </button>
        ))}
      </div>

      {tabs.map((t, i) =>
        safeActive === i ? (
          <div key={`panel-${i}`} className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Tab label</label>
            <input
              value={t.label}
              onChange={(e) => {
                const next = [...tabs];
                next[i] = { ...next[i], label: e.target.value };
                setTabs(next);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              HTML content (rich text from paragraph blocks pastes here)
            </label>
            <textarea
              value={t.html}
              onChange={(e) => {
                const next = [...tabs];
                next[i] = { ...next[i], html: e.target.value };
                setTabs(next);
              }}
              rows={10}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            <button
              type="button"
              disabled={tabs.length <= 1}
              onClick={() => {
                const next = tabs.filter((_, j) => j !== i);
                setTabs(next.length ? next : [{ label: 'Tab 1', html: '' }]);
                setActive(0);
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Remove tab
            </button>
          </div>
        ) : null,
      )}
    </div>
  );
}
