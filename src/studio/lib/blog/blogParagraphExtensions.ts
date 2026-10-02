import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Gapcursor } from '@tiptap/extension-gapcursor';
import CharacterCount from '@tiptap/extension-character-count';

import { FontSize } from '../tiptapFontSize';
import { BlogLink } from './blogLinkExtend';
import { LetterSpacing } from './blogLetterSpacing';
import { BlogFlowAttributes } from './blogFlowAttributes';

/** Rich prose inside a single “paragraph” block (headings, lists, hr, task lists, tables, embeds, marks). */
export function blogParagraphExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
      blockquote: {},
      codeBlock: { HTMLAttributes: { class: 'rounded-lg bg-slate-900 p-4 text-sm text-slate-100' } },
      horizontalRule: {},
    }),
    TaskList.configure({
      HTMLAttributes: { class: 'task-list pl-0' },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: 'task-item flex items-start gap-2' },
    }),
    Underline,
    Subscript,
    Superscript,
    BlogLink.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: 'text-brand-blue font-semibold underline underline-offset-2',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    TextStyle,
    FontFamily,
    FontSize.configure({ types: ['textStyle'] }),
    LetterSpacing,
    Color,
    Highlight.configure({ multicolor: true }),
    Image.configure({
      inline: false,
      allowBase64: false,
      HTMLAttributes: { class: 'max-w-full rounded-xl border border-slate-200 my-4' },
    }),
    Youtube.configure({
      controls: true,
      nocookie: true,
      HTMLAttributes: {
        class: 'aspect-video w-full max-w-3xl rounded-xl my-4 border border-slate-200',
      },
    }),
    Gapcursor,
    Table.configure({
      resizable: false,
      HTMLAttributes: { class: 'border-collapse table-fixed w-full border border-slate-200 my-4' },
    }),
    TableRow,
    TableHeader.configure({
      HTMLAttributes: { class: 'border border-slate-200 bg-slate-100 px-3 py-2 text-left font-bold text-sm' },
    }),
    TableCell.configure({
      HTMLAttributes: { class: 'border border-slate-200 px-3 py-2 text-sm align-top' },
    }),
    BlogFlowAttributes,
    CharacterCount.configure({ limit: null }),
    Placeholder.configure({ placeholder }),
  ];
}
