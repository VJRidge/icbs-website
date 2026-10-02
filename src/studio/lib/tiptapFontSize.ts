import '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';

export type FontSizeOptions = {
  types: string[];
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/** Adds `fontSize` on the TextStyle mark. Place after TextStyle / FontFamily and before Color in the extensions array. */
export const FontSize = Extension.create<FontSizeOptions>({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain, editor }) => {
          // Merge with existing textStyle attrs at the selection so color/family survive.
          const current = editor.getAttributes('textStyle') as Record<string, unknown>;
          return chain()
            .setMark('textStyle', { ...current, fontSize })
            .run();
        },
      unsetFontSize:
        () =>
        ({ chain, editor }) => {
          const current = { ...(editor.getAttributes('textStyle') as Record<string, unknown>) };
          delete current.fontSize;
          const hasAttrs = Object.values(current).some((v) => v != null && v !== '');
          if (!hasAttrs) {
            return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
          }
          return chain().setMark('textStyle', { ...current, fontSize: null }).run();
        },
    };
  },
});
