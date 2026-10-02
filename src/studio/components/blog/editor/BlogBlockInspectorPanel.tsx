import { BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from '../../../lib/blog/blogBlockTypes';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';
import { BlogInspectorTabs } from './BlogInspectorTabs';
import BlogBlockInspectorTabContent from './BlogBlockInspectorTabContent';

function inspectorContentPanel(block: BlogBlock) {
  if (block.type === 'paragraph') {
    const html = sanitizeBlogBlockHtml(String(block.data.text ?? '').trim() || '<p></p>') || '<p></p>';
    return (
      <div className="p-3">
        <p className="mb-3 text-xs leading-relaxed text-slate-600">
          Edit this paragraph in the <strong>center canvas</strong>. Use the toolbar above the post for font, size,
          color, bold, and links — changes sync here automatically.
        </p>
        <div
          className="prose prose-sm max-w-none text-slate-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }
  return <BlogBlockInspectorTabContent block={block} tab="content" />;
}

export default function BlogBlockInspectorPanel({ block }: { block: BlogBlock }) {
  const label = BLOG_BLOCK_LABELS[block.type as BlogBlockType] ?? block.type;

  return (
    <aside className="min-w-0 bg-[#04190f]">
      <div className="p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Module</p>
        <p className="mt-1 text-sm font-black text-brand-yellow">{label}</p>
        <p className="mt-1 text-[11px] font-medium text-white/55">Editing this module updates the preview in real time.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/95 shadow-sm">
        <BlogInspectorTabs
          content={inspectorContentPanel(block)}
          style={<BlogBlockInspectorTabContent block={block} tab="style" />}
          advanced={<BlogBlockInspectorTabContent block={block} tab="advanced" />}
        />
      </div>
    </aside>
  );
}

