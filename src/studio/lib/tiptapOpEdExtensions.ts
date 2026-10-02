import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { OpEdBodyVideo } from './tiptapOpEdVideo';
import { FontSize } from './tiptapFontSize';

/** TipTap setup for Op-Ed manuscript editor (images, video, YouTube + rich formatting). */
export function opEdRichEditorExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    Image.configure({ inline: false, allowBase64: false }),
    OpEdBodyVideo,
    Placeholder.configure({ placeholder }),
    Youtube.configure({
      controls: true,
      nocookie: true,
      HTMLAttributes: { class: 'aspect-video w-full max-w-3xl rounded-xl my-4 border border-slate-200' },
    }),
  ];
}
