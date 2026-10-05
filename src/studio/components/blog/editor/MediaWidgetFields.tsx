import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { ImageCarouselFields, MediaCarouselFields } from './CarouselWidgetFields';
import SlidesWidgetFields from './SlidesWidgetFields';

export default function MediaWidgetFields({ block, tab }: { block: BlogBlock; tab: 'content' | 'style' }) {
  if (block.type === 'slideshow') return <SlidesWidgetFields block={block} tab={tab} />;
  if (String(block.data.kind ?? '') === 'image') return <ImageCarouselFields block={block} tab={tab} />;
  return <MediaCarouselFields block={block} tab={tab} />;
}
