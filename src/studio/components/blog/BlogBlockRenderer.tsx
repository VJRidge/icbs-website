import { useEffect, useState } from 'react';
import type { BlogBlock } from '../../lib/blog/blogBlockTypes';
import BlogParagraphBlock from './blocks/BlogParagraphBlock';
import BlogHeadingBlock from './blocks/BlogHeadingBlock';
import BlogImageBlock from './blocks/BlogImageBlock';
import BlogYoutubeBlock from './blocks/BlogYoutubeBlock';
import BlogQuoteBlock from './blocks/BlogQuoteBlock';
import BlogCalloutBlock from './blocks/BlogCalloutBlock';
import BlogDividerBlock from './blocks/BlogDividerBlock';
import BlogSpacerBlock from './blocks/BlogSpacerBlock';
import BlogGalaxyBlock from './blocks/BlogGalaxyBlock';
import BlogVideoBlock from './blocks/BlogVideoBlock';
import BlogCodeBlock from './blocks/BlogCodeBlock';
import BlogTabsBlock from './blocks/BlogTabsBlock';
import BlogAccordionBlock from './blocks/BlogAccordionBlock';
import BlogSlideshowBlock from './blocks/BlogSlideshowBlock';
import BlogGalleryBlock from './blocks/BlogGalleryBlock';
import BlogCarouselBlock from './blocks/BlogCarouselBlock';
import BlogTimelineBlock from './blocks/BlogTimelineBlock';
import BlogStoryMetricsBlock from './blocks/BlogStoryMetricsBlock';
import BlogButtonBlock from './blocks/BlogButtonBlock';
import BlogBannerBlock from './blocks/BlogBannerBlock';
import BlogCardBlock from './blocks/BlogCardBlock';
import BlogCountdownBlock from './blocks/BlogCountdownBlock';
import BlogStatsBlock from './blocks/BlogStatsBlock';
import BlogTeamBlock from './blocks/BlogTeamBlock';
import BlogTableBlock from './blocks/BlogTableBlock';
import BlogMapEmbedBlock from './blocks/BlogMapEmbedBlock';
import BlogTestimonialBlock from './blocks/BlogTestimonialBlock';
import BlogIconBoxBlock from './blocks/BlogIconBoxBlock';
import BlogVideoPlaylistBlock from './blocks/BlogVideoPlaylistBlock';
import BlogPostTeasersBlock from './blocks/BlogPostTeasersBlock';
import BlogContactCtaBlock from './blocks/BlogContactCtaBlock';
import BlogPriceListBlock from './blocks/BlogPriceListBlock';
import BlogNewsletterBlock from './blocks/BlogNewsletterBlock';
import BlogModalPopupBlock from './blocks/BlogModalPopupBlock';
import BlogAnimatedHeadlineBlock from './blocks/BlogAnimatedHeadlineBlock';
import BlogSocialEmbedBlock from './blocks/BlogSocialEmbedBlock';
import BlogColumnsBlock from './blocks/BlogColumnsBlock';
import KitBlock from './blocks/brand/KitBlockCanvas';
import BrandBlockCanvas from './blocks/brand/BrandBlockCanvas';
import { isBrandBlockType } from '../../../brand/brandBlockTypes';
import { applyDevice } from '../../lib/blog/blockStyle';
import { useBlogEditorStore } from '../../lib/blog/useBlogEditorStore';

function useRenderDevice() {
  const previewActive = useBlogEditorStore((s) => s.previewActive);
  const previewDevice = useBlogEditorStore((s) => s.previewDevice);
  const [live, setLive] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 767px)');
    const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');
    const read = () => setLive(mobile.matches ? 'mobile' : tablet.matches ? 'tablet' : 'desktop');
    read();
    mobile.addEventListener('change', read);
    tablet.addEventListener('change', read);
    return () => {
      mobile.removeEventListener('change', read);
      tablet.removeEventListener('change', read);
    };
  }, []);
  return previewActive ? previewDevice : live;
}

export default function BlogBlockRenderer({
  block,
  isEditing,
  toolbarSource = true,
}: {
  block: BlogBlock;
  isEditing: boolean;
  toolbarSource?: boolean;
}) {
  const device = useRenderDevice();
  const view = applyDevice(block, device);
  switch (view.type) {
    case 'paragraph':
      return <BlogParagraphBlock block={view} isEditing={isEditing} toolbarSource={toolbarSource} />;
    case 'heading':
      return <BlogHeadingBlock block={view} isEditing={isEditing} />;
    case 'image':
      return <BlogImageBlock block={view} isEditing={isEditing} />;
    case 'youtube':
      return <BlogYoutubeBlock block={view} isEditing={isEditing} />;
    case 'social_embed':
      return <BlogSocialEmbedBlock block={view} isEditing={isEditing} />;
    case 'quote':
      return <BlogQuoteBlock block={view} isEditing={isEditing} />;
    case 'callout':
      return <BlogCalloutBlock block={view} isEditing={isEditing} />;
    case 'divider':
      return <BlogDividerBlock block={view} isEditing={isEditing} />;
    case 'spacer':
      return <BlogSpacerBlock block={view} isEditing={isEditing} />;
    case 'galaxy':
      return <BlogGalaxyBlock block={view} isEditing={isEditing} />;
    case 'video':
      return <BlogVideoBlock block={view} isEditing={isEditing} />;
    case 'code':
      return <BlogCodeBlock block={view} isEditing={isEditing} />;
    case 'tabs':
      return <BlogTabsBlock block={view} isEditing={isEditing} />;
    case 'accordion':
      return <BlogAccordionBlock block={view} isEditing={isEditing} />;
    case 'slideshow':
      return <BlogSlideshowBlock block={view} isEditing={isEditing} />;
    case 'gallery':
      return <BlogGalleryBlock block={view} isEditing={isEditing} />;
    case 'carousel':
      return <BlogCarouselBlock block={view} isEditing={isEditing} />;
    case 'timeline':
      return <BlogTimelineBlock block={view} isEditing={isEditing} />;
    case 'story_metrics':
      return <BlogStoryMetricsBlock block={view} isEditing={isEditing} />;
    case 'button':
      return <BlogButtonBlock block={view} isEditing={isEditing} />;
    case 'banner':
      return <BlogBannerBlock block={view} isEditing={isEditing} />;
    case 'card':
      return <BlogCardBlock block={view} isEditing={isEditing} />;
    case 'countdown':
      return <BlogCountdownBlock block={view} isEditing={isEditing} />;
    case 'stats':
      return <BlogStatsBlock block={view} isEditing={isEditing} />;
    case 'team':
      return <BlogTeamBlock block={view} isEditing={isEditing} />;
    case 'table':
      return <BlogTableBlock block={view} isEditing={isEditing} />;
    case 'map_embed':
      return <BlogMapEmbedBlock block={view} isEditing={isEditing} />;
    case 'testimonial':
      return <BlogTestimonialBlock block={view} isEditing={isEditing} />;
    case 'icon_box':
      return <BlogIconBoxBlock block={view} isEditing={isEditing} />;
    case 'video_playlist':
      return <BlogVideoPlaylistBlock block={view} isEditing={isEditing} />;
    case 'post_teasers':
      return <BlogPostTeasersBlock block={view} isEditing={isEditing} />;
    case 'contact_cta':
      return <BlogContactCtaBlock block={view} isEditing={isEditing} />;
    case 'price_list':
      return <BlogPriceListBlock block={view} isEditing={isEditing} />;
    case 'newsletter':
      return <BlogNewsletterBlock block={view} isEditing={isEditing} />;
    case 'modal_popup':
      return <BlogModalPopupBlock block={view} isEditing={isEditing} />;
    case 'animated_headline':
      return <BlogAnimatedHeadlineBlock block={view} isEditing={isEditing} />;
    case 'columns':
      return <BlogColumnsBlock block={view} isEditing={isEditing} />;
    case 'kit_hero':
    case 'kit_contents':
    case 'kit_gallery':
    case 'kit_closing':
    case 'kit_text':
    case 'kit_signup':
    case 'kit_questions':
      return <KitBlock block={view} isEditing={isEditing} />;
    default:
      if (isBrandBlockType(block.type)) return <BrandBlockCanvas block={view} isEditing={isEditing} />;
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Unsupported block type: <code className="font-mono">{view.type}</code>. Open in admin to replace or remove.
        </div>
      );
  }
}
