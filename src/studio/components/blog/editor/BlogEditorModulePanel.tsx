import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { findBlockInTree } from '../../../lib/blog/blogBlockTree';
import ColumnWidgetTray from '../../../../brand/ColumnWidgetTray';
import { useWidgetTray } from '../../../../brand/widgetTray';
import BlogBlockInspectorPanel from './BlogBlockInspectorPanel';
import BlogImageInspectorPanel from './BlogImageInspectorPanel';

export default function BlogEditorModulePanel() {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const trayOpen = useWidgetTray((s) => s.open);
  const block = selectedBlockId ? findBlockInTree(blocks, selectedBlockId) : null;

  if (trayOpen || !block) {
    return <ColumnWidgetTray />;
  }

  if (block.type === 'image') {
    return (
      <BlogImageInspectorPanel block={block} />
    );
  }

  return <BlogBlockInspectorPanel block={block} />;
}
