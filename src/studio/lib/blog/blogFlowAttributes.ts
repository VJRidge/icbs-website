import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blogFlow: {
      setBlogLineHeight: (value: string | null) => ReturnType;
      setBlogParagraphIndent: (value: string | null) => ReturnType;
      bumpBlogParagraphIndent: (deltaEm: number) => ReturnType;
    };
  }
}

/** Line height on paragraphs & headings; paragraph left indent (padding). */
export const BlogFlowAttributes = Extension.create({
  name: 'blogFlow',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
          paragraphIndent: {
            default: null,
            parseHTML: (element) => element.style.paddingLeft || null,
            renderHTML: (attributes) => {
              if (!attributes.paragraphIndent) return {};
              return { style: `padding-left: ${attributes.paragraphIndent}` };
            },
          },
        },
      },
      {
        types: ['heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlogLineHeight:
        (value: string | null) =>
        ({ editor, chain }) => {
          const name = editor.state.selection.$from.parent.type.name;
          if (name === 'paragraph') return chain().focus().updateAttributes('paragraph', { lineHeight: value }).run();
          if (name === 'heading') return chain().focus().updateAttributes('heading', { lineHeight: value }).run();
          return false;
        },
      setBlogParagraphIndent:
        (value: string | null) =>
        ({ editor, chain }) => {
          if (editor.state.selection.$from.parent.type.name !== 'paragraph') return false;
          return chain().focus().updateAttributes('paragraph', { paragraphIndent: value }).run();
        },
      bumpBlogParagraphIndent:
        (deltaEm: number) =>
        ({ editor, chain }) => {
          if (editor.state.selection.$from.parent.type.name !== 'paragraph') return false;
          const raw = editor.state.selection.$from.parent.attrs.paragraphIndent as string | null | undefined;
          const num = parseFloat(raw || '0') || 0;
          const next = Math.max(0, num + deltaEm);
          return chain()
            .focus()
            .updateAttributes('paragraph', { paragraphIndent: next > 0 ? `${next}em` : null })
            .run();
        },
    };
  },
});
