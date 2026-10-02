import { Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

function normalizeRows(raw: unknown): string[][] {
  if (!Array.isArray(raw) || raw.length === 0) return [['', ''], ['', '']];
  return raw.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : ['']));
}

export default function BlogTableBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const rows = normalizeRows(block.data.rows);
  const hasHeader = Boolean(block.data.hasHeader);

  const setRows = (next: string[][]) => updateBlock(block.id, { rows: next });
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const padRow = (r: string[]) => {
    const x = [...r];
    while (x.length < cols) x.push('');
    return x.slice(0, cols);
  };
  const padded = rows.map(padRow);

  if (!isEditing) {
    return (
      <div className="my-6 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse overflow-hidden rounded-xl border border-slate-200 text-sm">
          <tbody>
            {padded.map((row, ri) => (
              <tr key={ri} className={hasHeader && ri === 0 ? 'bg-brand-blue text-brand-yellow' : 'bg-white'}>
                {row.map((cell, ci) => {
                  const Tag = hasHeader && ri === 0 ? 'th' : 'td';
                  return (
                    <Tag key={ci} className="border border-slate-200 px-3 py-2 text-left font-medium">
                      {cell}
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const updateCell = (ri: number, ci: number, v: string) => {
    const next = padded.map((r, rj) => (rj === ri ? r.map((c, ck) => (ck === ci ? v : c)) : [...r]));
    setRows(next);
  };

  const addRow = () => setRows([...padded, Array.from({ length: cols }, () => '')]);
  const addCol = () => setRows(padded.map((r) => [...r, '']));
  const removeRow = (ri: number) => {
    if (padded.length <= 1) return;
    setRows(padded.filter((_, j) => j !== ri));
  };
  const removeLastCol = () => {
    if (cols <= 1) return;
    setRows(padded.map((r) => r.slice(0, -1)));
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <label className="flex items-center gap-2 text-xs font-bold">
        <input type="checkbox" checked={hasHeader} onChange={(e) => updateBlock(block.id, { hasHeader: e.target.checked })} />
        First row is header
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRow} className="rounded-lg bg-white px-2 py-1 text-xs font-black uppercase shadow-sm">
          + Row
        </button>
        <button type="button" onClick={addCol} className="rounded-lg bg-white px-2 py-1 text-xs font-black uppercase shadow-sm">
          + Column
        </button>
        <button
          type="button"
          onClick={removeLastCol}
          disabled={cols <= 1}
          className="rounded-lg bg-white px-2 py-1 text-xs font-black uppercase text-slate-600 shadow-sm disabled:opacity-40"
        >
          − Last column
        </button>
      </div>
      <div className="space-y-1 overflow-x-auto">
        {padded.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1">
            {row.map((cell, ci) => (
              <input
                key={ci}
                value={cell}
                onChange={(e) => updateCell(ri, ci, e.target.value)}
                className="min-w-[88px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs"
              />
            ))}
            <button type="button" onClick={() => removeRow(ri)} className="shrink-0 p-1 text-red-500 hover:bg-red-50" aria-label="Remove row">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
