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

export default function BlogBlockRenderer({
  block,
  isEditing,
  toolbarSource = true,
}: {
  block: BlogBlock;
  isEditing: boolean;
  toolbarSource?: boolean;
}) {
  switch (block.type) {
    case 'paragraph':
      return <BlogParagraphBlock block={block} isEditing={isEditing} toolbarSource={toolbarSource} />;
    case 'heading':
      return <BlogHeadingBlock block={block} isEditing={isEditing} />;
    case 'image':
      return <BlogImageBlock block={block} isEditing={isEditing} />;
    case 'youtube':
      return <BlogYoutubeBlock block={block} isEditing={isEditing} />;
    case 'social_embed':
      return <BlogSocialEmbedBlock block={block} isEditing={isEditing} />;
    case 'quote':
      return <BlogQuoteBlock block={block} isEditing={isEditing} />;
    case 'callout':
      return <BlogCalloutBlock block={block} isEditing={isEditing} />;
    case 'divider':
      return <BlogDividerBlock block={block} isEditing={isEditing} />;
    case 'spacer':
      return <BlogSpacerBlock block={block} isEditing={isEditing} />;
    case 'galaxy':
      return <BlogGalaxyBlock block={block} isEditing={isEditing} />;
    case 'video':
      return <BlogVideoBlock block={block} isEditing={isEditing} />;
    case 'code':
      return <BlogCodeBlock block={block} isEditing={isEditing} />;
    case 'tabs':
      return <BlogTabsBlock block={block} isEditing={isEditing} />;
    case 'accordion':
      return <BlogAccordionBlock block={block} isEditing={isEditing} />;
    case 'slideshow':
      return <BlogSlideshowBlock block={block} isEditing={isEditing} />;
    case 'gallery':
      return <BlogGalleryBlock block={block} isEditing={isEditing} />;
    case 'carousel':
      return <BlogCarouselBlock block={block} isEditing={isEditing} />;
    case 'timeline':
      return <BlogTimelineBlock block={block} isEditing={isEditing} />;
    case 'story_metrics':
      return <BlogStoryMetricsBlock block={block} isEditing={isEditing} />;
    case 'button':
      return <BlogButtonBlock block={block} isEditing={isEditing} />;
    case 'banner':
      return <BlogBannerBlock block={block} isEditing={isEditing} />;
    case 'card':
      return <BlogCardBlock block={block} isEditing={isEditing} />;
    case 'countdown':
      return <BlogCountdownBlock block={block} isEditing={isEditing} />;
    case 'stats':
      return <BlogStatsBlock block={block} isEditing={isEditing} />;
    case 'team':
      return <BlogTeamBlock block={block} isEditing={isEditing} />;
    case 'table':
      return <BlogTableBlock block={block} isEditing={isEditing} />;
    case 'map_embed':
      return <BlogMapEmbedBlock block={block} isEditing={isEditing} />;
    case 'testimonial':
      return <BlogTestimonialBlock block={block} isEditing={isEditing} />;
    case 'icon_box':
      return <BlogIconBoxBlock block={block} isEditing={isEditing} />;
    case 'video_playlist':
      return <BlogVideoPlaylistBlock block={block} isEditing={isEditing} />;
    case 'post_teasers':
      return <BlogPostTeasersBlock block={block} isEditing={isEditing} />;
    case 'contact_cta':
      return <BlogContactCtaBlock block={block} isEditing={isEditing} />;
    case 'price_list':
      return <BlogPriceListBlock block={block} isEditing={isEditing} />;
    case 'newsletter':
      return <BlogNewsletterBlock block={block} isEditing={isEditing} />;
    case 'modal_popup':
      return <BlogModalPopupBlock block={block} isEditing={isEditing} />;
    case 'animated_headline':
      return <BlogAnimatedHeadlineBlock block={block} isEditing={isEditing} />;
    case 'columns':
      return <BlogColumnsBlock block={block} isEditing={isEditing} />;
    default:
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Unsupported block type: <code className="font-mono">{block.type}</code>. Open in admin to replace or remove.
        </div>
      );
  }
}
