import { Node, mergeAttributes } from '@tiptap/core';

/** Uploaded / hosted video block inside the manuscript (not YouTube iframe). */
export const OpEdBodyVideo = Node.create({
  name: 'opEdBodyVideo',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'video' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: true,
        class: 'w-full max-h-[min(70vh,520px)] rounded-xl my-4 object-contain bg-black',
      }),
    ];
  },
});
