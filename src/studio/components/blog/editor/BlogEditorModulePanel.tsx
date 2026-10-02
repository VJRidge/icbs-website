import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { findBlockInTree } from '../../../lib/blog/blogBlockTree';
import BlogBlockInspectorPanel from './BlogBlockInspectorPanel';
import BlogImageInspectorPanel from './BlogImageInspectorPanel';

export default function BlogEditorModulePanel() {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const block = selectedBlockId ? findBlockInTree(blocks, selectedBlockId) : null;

  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">No block selected</p>
        <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-slate-500">
          Click a block in the canvas to edit it here — or use <strong>Image tools</strong> on an image block.
        </p>
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <BlogImageInspectorPanel block={block} />
    );
  }

  return <BlogBlockInspectorPanel block={block} />;
}
