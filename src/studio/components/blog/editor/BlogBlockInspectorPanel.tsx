import { BLOG_BLOCK_LABELS, type BlogBlock, type BlogBlockType } from '../../../lib/blog/blogBlockTypes';
import BlogParagraphBlock from '../blocks/BlogParagraphBlock';
import BlogFormatToolbar from './BlogFormatToolbar';
import { isBrandBlockType } from '../../../../brand/brandBlockTypes';
import { useSelectedPiece } from '../../../../brand/BrandPiecePanel';
import { widgetName } from '../../../../brand/brandPieces';
import { BlogInspectorTabs } from './BlogInspectorTabs';
import BlogBlockInspectorTabContent from './BlogBlockInspectorTabContent';

function inspectorContentPanel(block: BlogBlock) {
  if (block.type === 'paragraph') {
    return (
      <div data-paragraph-editor>
        <BlogFormatToolbar />
        <div className="p-3">
          <BlogParagraphBlock block={block} isEditing toolbarSource />
        </div>
      </div>
    );
  }
  return <BlogBlockInspectorTabContent block={block} tab="content" />;
}

const EDIT_LABELS: Partial<Record<BlogBlockType, string>> = {
  slideshow: 'Media Slider',
  carousel: 'Media carousel',
  columns: 'Container',
  paragraph: 'Text Editor',
  heading: 'Heading',
  image: 'Image',
  video: 'Video',
  button: 'Button',
  gallery: 'Gallery',
  post_teasers: 'Posts',
};

export default function BlogBlockInspectorPanel({ block }: { block: BlogBlock }) {
  const piece = useSelectedPiece(block.id);
  const section =
    block.type === 'carousel' && block.data.kind === 'image'
      ? 'Image carousel'
      : (EDIT_LABELS[block.type as BlogBlockType] ?? BLOG_BLOCK_LABELS[block.type as BlogBlockType] ?? block.type);
  const brand = isBrandBlockType(block.type);
  const label = brand && piece ? widgetName(piece) : section;

  return (
    <aside className="min-w-0 bg-[#04190f]">
      <div className="p-3">
        <p className="mt-1 text-sm font-black text-white">Edit {label}</p>
        <p className="mt-1 text-[11px] font-medium text-white/55">Editing this module updates the preview in real time.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/95 shadow-sm">
        <BlogInspectorTabs
          labels={brand ? { content: 'General', advanced: 'Interactions' } : undefined}
          content={inspectorContentPanel(block)}
          style={<BlogBlockInspectorTabContent block={block} tab="style" />}
          advanced={<BlogBlockInspectorTabContent block={block} tab="advanced" />}
        />
      </div>
    </aside>
  );
}

