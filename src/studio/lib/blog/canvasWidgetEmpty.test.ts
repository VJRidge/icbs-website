import { describe, expect, it } from 'vitest';
import { COLUMN_WIDGETS } from '../../../brand/columnWidgets';
import { canvasWidgetEmptyLabel, canvasWidgetShowsEmpty } from './canvasWidgetEmpty';
import { carouselPreset } from './mediaWidgetOptions';
import { createBlogBlock } from './useBlogEditorStore';

describe('canvasWidgetEmptyLabel', () => {
  it('flags dropped media widgets that would render nothing on the canvas', () => {
    expect(canvasWidgetEmptyLabel({ type: 'carousel', data: { kind: 'media', items: [{ url: '' }] } })).toBe(
      'Add carousel media',
    );
    expect(canvasWidgetEmptyLabel({ type: 'slideshow', data: { slides: [{ url: '' }] } })).toBe('Add slides');
    expect(canvasWidgetEmptyLabel({ type: 'gallery', data: { images: [{ url: '' }] } })).toBe('Add gallery images');
    expect(canvasWidgetEmptyLabel({ type: 'video', data: { url: '' } })).toBe('Add a video');
    expect(canvasWidgetEmptyLabel({ type: 'youtube', data: { videoId: '' } })).toBe('Add a YouTube video');
    expect(canvasWidgetEmptyLabel({ type: 'image', data: { url: '' } })).toBe('Choose an image');
    expect(canvasWidgetEmptyLabel({ type: 'quote', data: { text: '' } })).toBe('Add a quote');
    expect(canvasWidgetEmptyLabel({ type: 'social_embed', data: { input: '' } })).toBe('Paste a social post');
    expect(canvasWidgetEmptyLabel({ type: 'video_playlist', data: { videos: [{ videoId: '' }] } })).toBe(
      'Add playlist videos',
    );
    expect(canvasWidgetEmptyLabel({ type: 'tabs', data: { tabs: [] } })).toBe('Add tabs');
    expect(canvasWidgetEmptyLabel({ type: 'accordion', data: { items: [] } })).toBe('Add accordion sections');
  });

  it('leaves widgets with default or filled content alone', () => {
    expect(canvasWidgetEmptyLabel({ type: 'button', data: { text: 'Click here' } })).toBeNull();
    expect(canvasWidgetEmptyLabel({ type: 'heading', data: { text: 'This is a title' } })).toBeNull();
    expect(canvasWidgetEmptyLabel({ type: 'carousel', data: { items: [{ url: 'https://x.test/a.jpg' }] } })).toBeNull();
    expect(canvasWidgetEmptyLabel({ type: 'tabs', data: { tabs: [{ label: 'Tab 1', html: '' }] } })).toBeNull();
    expect(canvasWidgetEmptyLabel({ type: 'icon_box', data: { icon: '🎓', title: '', body: '' } })).toBeNull();
    expect(canvasWidgetShowsEmpty({ type: 'icon_box', data: { icon: '🎓', title: '', body: '' } })).toBe(true);
    expect(canvasWidgetShowsEmpty({ type: 'banner', data: { text: '', subtext: '' } })).toBe(true);
    expect(canvasWidgetShowsEmpty({ type: 'divider', data: {} })).toBe(false);
    expect(canvasWidgetShowsEmpty({ type: 'news_ticker', data: { items: [{ text: 'New on the site' }] } })).toBe(false);
  });

  it('marks tray widgets that drop with no canvas hit target', () => {
    const dropped = COLUMN_WIDGETS.map((widget) => createBlogBlock(widget.type, carouselPreset(widget.preset)));
    const emptyDrops = dropped.filter((block) => canvasWidgetShowsEmpty(block)).map((block) => block.type);
    expect(emptyDrops).toEqual(['image', 'paragraph', 'video', 'icon_box', 'price_list', 'testimonial', 'quote', 'code', 'gallery', 'slideshow', 'carousel', 'carousel']);
    expect(dropped.filter((block) => canvasWidgetEmptyLabel(block)).map((block) => block.type)).toEqual([
      'image',
      'paragraph',
      'video',
      'quote',
      'gallery',
      'slideshow',
      'carousel',
      'carousel',
    ]);
  });
});
