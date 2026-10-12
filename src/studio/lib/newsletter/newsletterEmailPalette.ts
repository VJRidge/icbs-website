/** Mailchimp-style email block palette for the newsletter editor. */

import type { BlogBlockType } from '../blog/blogBlockTypes';

export type NewsletterEmailPaletteItem = {
  key: string;
  label: string;
  type: BlogBlockType;
  data?: Record<string, unknown>;
};

/**
 * Labels mirror Mailchimp’s content blocks where we have a close equivalent.
 * Image Group → gallery; Image Card → card; Code → html_embed; Video → youtube.
 */
export const NEWSLETTER_EMAIL_PALETTE: NewsletterEmailPaletteItem[] = [
  { key: 'text', label: 'Text', type: 'paragraph' },
  {
    key: 'boxed_text',
    label: 'Boxed text',
    type: 'callout',
    data: { text: '<p>Call out one important point.</p>', variant: 'info', icon: '' },
  },
  { key: 'divider', label: 'Divider', type: 'divider' },
  { key: 'image', label: 'Image', type: 'image' },
  {
    key: 'image_group',
    label: 'Image group',
    type: 'gallery',
    data: {
      images: [
        { url: '', alt: '', caption: '', credit: '', focalX: 50, focalY: 50 },
        { url: '', alt: '', caption: '', credit: '', focalX: 50, focalY: 50 },
      ],
      mode: 'grid',
      columns: 2,
    },
  },
  {
    key: 'image_card',
    label: 'Image card',
    type: 'card',
    data: {
      title: 'Card title',
      body: 'Short supporting copy.',
      image: '',
      link: 'https://icallbs.com/',
      linkText: 'Learn more',
    },
  },
  {
    key: 'image_caption',
    label: 'Image + caption',
    type: 'image',
    data: { url: '', alt: '', caption: 'Caption goes here' },
  },
  {
    key: 'social_share',
    label: 'Social share',
    type: 'social_embed',
    data: {
      input: 'Share this issue',
      caption: 'Add your share links in the block settings.',
    },
  },
  {
    key: 'social_follow',
    label: 'Social follow',
    type: 'social_embed',
    data: {
      input: 'Follow us',
      caption: 'Add profile URLs in the block settings.',
    },
  },
  {
    key: 'button',
    label: 'Button',
    type: 'button',
    data: { text: 'Learn more', url: 'https://icallbs.com/', style: 'primary', align: 'center' },
  },
  {
    key: 'footer',
    label: 'Footer',
    type: 'paragraph',
    data: {
      text: '<p style="font-size:13px;color:#666">You are receiving this because you signed up at I Call BS.<br /><a href="{{unsubscribe_url}}">Unsubscribe</a></p>',
      align: 'center',
    },
  },
  {
    key: 'code',
    label: 'Code',
    type: 'html_embed',
    data: { html: '<!-- Custom email HTML -->', sandboxed: true },
  },
  {
    key: 'video',
    label: 'Video',
    type: 'youtube',
    data: { videoId: '', caption: 'Watch the video' },
  },
  { key: 'heading', label: 'Heading', type: 'heading' },
  { key: 'spacer', label: 'Spacer', type: 'spacer', data: { height: 24 } },
];
