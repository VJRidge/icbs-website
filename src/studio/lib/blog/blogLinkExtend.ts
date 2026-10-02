import Link from '@tiptap/extension-link';

/** Link mark with optional `target` (open in new tab) preserved in HTML. */
export const BlogLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      target: {
        default: null,
        parseHTML: (element) => element.getAttribute('target'),
        renderHTML: (attributes) => {
          if (!attributes.target) return {};
          return { target: attributes.target, rel: 'noopener noreferrer' };
        },
      },
    };
  },
});
