import { useState, type ReactNode } from 'react';
import { List, Paintbrush, Settings2 } from 'lucide-react';

export type BlogInspectorTabId = 'content' | 'style' | 'advanced';

const TABS: { id: BlogInspectorTabId; label: string; icon: typeof List }[] = [
  { id: 'content', label: 'Content', icon: List },
  { id: 'style', label: 'Style', icon: Paintbrush },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
];

export function BlogInspectorTabs({
  defaultTab = 'content',
  labels,
  content,
  style,
  advanced,
}: {
  defaultTab?: BlogInspectorTabId;
  labels?: Partial<Record<BlogInspectorTabId, string>>;
  content: ReactNode;
  style: ReactNode;
  advanced: ReactNode;
}) {
  const [tab, setTab] = useState<BlogInspectorTabId>(defaultTab);

  const panels: Record<BlogInspectorTabId, ReactNode> = {
    content,
    style,
    advanced,
  };

  return (
    <div>
      <div
        className="flex border-b border-slate-200 bg-white"
        role="tablist"
        aria-label="Module settings"
      >
        {TABS.map(({ id, label: fallback, icon: Icon }) => {
          const label = labels?.[id] ?? fallback;
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`blog-inspector-panel-${id}`}
              id={`blog-inspector-tab-${id}`}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 px-2 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                active
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              title={label}
            >
              <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.75} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      {(Object.keys(panels) as BlogInspectorTabId[]).map((id) => (
        <div
          key={id}
          id={`blog-inspector-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`blog-inspector-tab-${id}`}
          hidden={tab !== id}
          className="p-2.5"
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
