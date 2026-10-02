import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { findBlockInTree } from '../../../lib/blog/blogBlockTree';
import BlogBlockEditModal from './BlogBlockEditModal';

export default function BlogBlockEditModalHost() {
  const blockEditModalId = useBlogEditorStore((s) => s.blockEditModalId);
  const blocks = useBlogEditorStore((s) => s.blocks);
  const closeBlockEditModal = useBlogEditorStore((s) => s.closeBlockEditModal);

  const block = blockEditModalId ? findBlockInTree(blocks, blockEditModalId) : null;

  if (!block) return null;

  return <BlogBlockEditModal block={block} onClose={closeBlockEditModal} />;
}
