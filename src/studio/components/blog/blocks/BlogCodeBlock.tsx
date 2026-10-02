import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

export default function BlogCodeBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const code = String(block.data.code ?? '');
  const language = String(block.data.language ?? 'plaintext');
  const filename = String(block.data.filename ?? '');

  if (!isEditing) {
    return (
      <pre className="my-4 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Language</label>
          <input
            value={language}
            onChange={(e) => updateBlock(block.id, { language: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Filename</label>
          <input
            value={filename}
            onChange={(e) => updateBlock(block.id, { filename: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="optional"
          />
        </div>
      </div>
      <textarea
        value={code}
        onChange={(e) => updateBlock(block.id, { code: e.target.value })}
        rows={8}
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
        spellCheck={false}
      />
    </div>
  );
}
