import '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
  }
}

/** Adds `fontWeight` on the TextStyle mark so weight applies to the highlight, not the whole block. */
export const FontWeight = Extension.create({
  name: 'fontWeight',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element) => element.style.fontWeight || null,
            renderHTML: (attributes) => {
              if (!attributes.fontWeight) return {};
              return { style: `font-weight: ${attributes.fontWeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontWeight:
        (fontWeight: string) =>
        ({ chain, editor }) => {
          const current = editor.getAttributes('textStyle') as Record<string, unknown>;
          return chain()
            .setMark('textStyle', { ...current, fontWeight })
            .run();
        },
      unsetFontWeight:
        () =>
        ({ chain, editor }) => {
          const current = { ...(editor.getAttributes('textStyle') as Record<string, unknown>) };
          delete current.fontWeight;
          const hasAttrs = Object.values(current).some((v) => v != null && v !== '');
          if (!hasAttrs) {
            return chain().setMark('textStyle', { fontWeight: null }).removeEmptyTextStyle().run();
          }
          return chain().setMark('textStyle', { ...current, fontWeight: null }).run();
        },
    };
  },
});
