import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { readAccordionItems, type AccordionItem } from '../../../lib/blog/accordionItems';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import BlogInspectorSection from './BlogInspectorSection';

function writeItems(items: AccordionItem[]): AccordionItem[] {
  return items.map((item) => ({ ...item, bullets: [...item.bullets] }));
}

export default function BlogAccordionInspector({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const items = readAccordionItems(block.data as Record<string, unknown>);
  const oneAtATime = block.data.allowMultiple === false;

  const setItems = (next: AccordionItem[]) => updateBlock(block.id, { items: writeItems(next) });

  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-700">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Heading</span>
        <input
          value={String(block.data.heading ?? '')}
          onChange={(event) => updateBlock(block.id, { heading: event.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={oneAtATime}
          onChange={(event) => updateBlock(block.id, { allowMultiple: !event.target.checked })}
        />
        Only one row open at a time
      </label>
      {items.map((item, index) => (
        <BlogInspectorSection key={`acc-item-${index}`} title={`Row ${index + 1}`} defaultOpen={index === 0}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={index === 0}
                className="rounded border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                onClick={() => {
                  const next = writeItems(items);
                  const [row] = next.splice(index, 1);
                  next.splice(index - 1, 0, row!);
                  setItems(next);
                }}
              >
                Up
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                className="rounded border border-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                onClick={() => {
                  const next = writeItems(items);
                  const [row] = next.splice(index, 1);
                  next.splice(index + 1, 0, row!);
                  setItems(next);
                }}
              >
                Down
              </button>
              <button
                type="button"
                disabled={items.length <= 1}
                className="ml-auto rounded border border-red-200 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 disabled:opacity-40"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={item.open}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setItems(
                    items.map((row, i) => ({
                      ...row,
                      open: i === index ? checked : oneAtATime && checked ? false : row.open,
                    })),
                  );
                }}
              />
              Open by default
            </label>
            <input
              value={item.title}
              onChange={(event) => {
                const next = writeItems(items);
                next[index] = { ...next[index]!, title: event.target.value };
                setItems(next);
              }}
              placeholder="Title"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              value={item.intro}
              onChange={(event) => {
                const next = writeItems(items);
                next[index] = { ...next[index]!, intro: event.target.value };
                setItems(next);
              }}
              placeholder="Intro paragraph"
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              value={item.bullets.join('\n')}
              onChange={(event) => {
                const next = writeItems(items);
                next[index] = {
                  ...next[index]!,
                  bullets: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                };
                setItems(next);
              }}
              placeholder="One bullet per line"
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </BlogInspectorSection>
      ))}
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
        onClick={() =>
          setItems([...items, { title: `Section ${items.length + 1}`, intro: '', bullets: [], html: '', open: false }])
        }
      >
        Add row
      </button>
    </div>
  );
}
