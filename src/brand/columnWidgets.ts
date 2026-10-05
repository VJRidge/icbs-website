import type { BlogBlock, BlogBlockType } from '../studio/lib/blog/blogBlockTypes'
import { carouselPreset } from '../studio/lib/blog/mediaWidgetOptions'
import { createBlogBlock } from '../studio/lib/blog/useBlogEditorStore'

/** Widgets that already have a block renderer. One entry per block type. */
export const COLUMN_WIDGETS: { type: BlogBlockType; label: string; preset?: string }[] = [
  { type: 'heading', label: 'Heading' },
  { type: 'image', label: 'Image' },
  { type: 'paragraph', label: 'Text Editor' },
  { type: 'button', label: 'Button' },
  { type: 'divider', label: 'Divider' },
  { type: 'spacer', label: 'Spacer' },
  { type: 'tabs', label: 'Tabs' },
  { type: 'animated_headline', label: 'Animated text' },
  { type: 'video', label: 'Video' },
  { type: 'icon_box', label: 'Icon' },
  { type: 'price_list', label: 'Price list' },
  { type: 'contact_cta', label: 'Call to action' },
  { type: 'testimonial', label: 'Testimonial' },
  { type: 'countdown', label: 'Countdown' },
  { type: 'timeline', label: 'Timeline' },
  { type: 'quote', label: 'Quote' },
  { type: 'code', label: 'HTML / code' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'slideshow', label: 'Media Slider' },
  { type: 'carousel', label: 'Media carousel', preset: 'media' },
  { type: 'carousel', label: 'Image carousel', preset: 'image' },
  { type: 'post_teasers', label: 'Posts' },
]

export const NESTABLE_WIDGETS = new Set<BlogBlockType>(COLUMN_WIDGETS.map((widget) => widget.type))

export const WIDGET_DRAG = 'application/x-icbs-widget'

export function widgetFromToken(token: string): { type: BlogBlockType; preset?: string } | null {
  const [type, preset] = token.split(':')
  if (!type || !NESTABLE_WIDGETS.has(type as BlogBlockType)) return null
  return { type: type as BlogBlockType, preset }
}

export function blockFromWidgetToken(token: string): BlogBlock | null {
  const parsed = widgetFromToken(token)
  if (!parsed) return null
  return createBlogBlock(parsed.type, carouselPreset(parsed.preset))
}
