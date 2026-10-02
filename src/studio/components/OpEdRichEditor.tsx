import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Heading2,
  Heading3,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Underline as UnderlineIcon,
  Undo2,
  Video,
  Youtube as YoutubeIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadLandingMedia } from '../lib/landingEditorUploadShared';
import { htmlCharCount, htmlWordCount } from '../lib/opEdManuscript';
import { opEdRichEditorExtensions } from '../lib/tiptapOpEdExtensions';
import { RichEditorHighlightDropdown, RichEditorTextColorDropdown } from './RichEditorColorMenus';
import { RichEditorFontControls } from './RichEditorFontControls';
import { EditorToolbarButton } from './editor/EditorToolbarButton';
import {
  applyEditorHighlight,
  applyEditorTextColor,
  saveToolbarEditorSelection,
} from '../lib/tiptapTextStyleCommands';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function ToolbarSep() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200/90" aria-hidden />;
}

async function uploadToCommunity(file: File): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Sign in to upload files.');
  return uploadLandingMedia(userId, file);
}

export default function OpEdRichEditor({ value, onChange, placeholder = 'Write your piece…', disabled }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<string>(value);
  const [fullscreen, setFullscreen] = useState(false);
  /** Bumped on selection/transaction so toolbar reads fresh marks (text/highlight color). */
  const [, bumpToolbarUi] = useState(0);

  const extensions = useMemo(() => opEdRichEditorExtensions(placeholder), [placeholder]);

  const wordCount = useMemo(() => htmlWordCount(value || ''), [value]);
  const charCount = useMemo(() => htmlCharCount(value || ''), [value]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '<p></p>',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-slate max-w-none prose-headings:font-black prose-p:font-medium prose-li:marker:text-slate-400 focus:outline-none min-h-[280px] px-4 py-3',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const sync = () => bumpToolbarUi((n) => n + 1);
    editor.on('selectionUpdate', sync);
    editor.on('transaction', sync);
    return () => {
      editor.off('selectionUpdate', sync);
      editor.off('transaction', sync);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    const current = editor.getHTML();
    if (value === current) return;
    editor.commands.setContent(value || '<p></p>', false);
    lastEmitted.current = value;
  }, [value, editor]);

  const onPickImage = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      try {
        const url = await uploadToCommunity(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (err) {
        console.error(err);
        window.alert('Could not upload image.');
      }
    },
    [editor],
  );

  const onPickVideo = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;
      try {
        const url = await uploadToCommunity(file);
        editor.chain().focus().insertContent({ type: 'opEdBodyVideo', attrs: { src: url } }).run();
      } catch (err) {
        console.error(err);
        window.alert('Could not upload video.');
      }
    },
    [editor],
  );

  const setYoutube = useCallback(() => {
    if (!editor) return;
    const raw = window.prompt('Paste a YouTube link (watch or youtu.be):');
    if (!raw?.trim()) return;
    const ok = editor.chain().focus().setYoutubeVideo({ src: raw.trim() }).run();
    if (!ok) window.alert('That does not look like a valid YouTube URL.');
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt('Link URL', prev || 'https://');
    if (next === null) return;
    const t = next.trim();
    if (!t) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run();
  }, [editor]);

  const pastePlain = useCallback(async () => {
    if (!editor || disabled) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      editor.chain().focus().insertContent(text).run();
    } catch {
      window.alert('Clipboard access was denied or unavailable.');
    }
  }, [disabled, editor]);

  if (!editor) {
    return <div className="min-h-[320px] rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />;
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
        fullscreen ? 'fixed inset-0 z-[100] flex flex-col rounded-none shadow-2xl' : ''
      }`}
    >
      <div
        className={`flex flex-col gap-0.5 border-b border-slate-100 bg-slate-50/90 px-1.5 py-1 ${
          fullscreen ? 'sticky top-0 z-10 shrink-0 bg-white' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-0.5">
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Undo"
            disabled={disabled || !editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Redo"
            disabled={disabled || !editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <ToolbarSep />
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Bold"
            disabled={disabled}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Italic"
            disabled={disabled}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Underline"
            disabled={disabled}
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Strikethrough"
            disabled={disabled}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Subscript"
            disabled={disabled}
            active={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
          >
            <SubIcon className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Superscript"
            disabled={disabled}
            active={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
          >
            <SupIcon className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <ToolbarSep />
          <RichEditorFontControls editor={editor} disabled={disabled} />
          <ToolbarSep />
          <RichEditorTextColorDropdown
            disabled={disabled}
            currentColor={editor.getAttributes('textStyle').color as string | undefined}
            size="md"
            onOpen={() => saveToolbarEditorSelection(editor)}
            onPick={(hex) => applyEditorTextColor(editor, hex)}
            onClear={() => applyEditorTextColor(editor, '')}
          />
          <RichEditorHighlightDropdown
            disabled={disabled}
            currentHighlightColor={(editor.getAttributes('highlight') as { color?: string }).color}
            size="md"
            onOpen={() => saveToolbarEditorSelection(editor)}
            onPick={(hex) => applyEditorHighlight(editor, hex)}
            onClear={() => applyEditorHighlight(editor, '')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-0.5">
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Align left"
            disabled={disabled}
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Align center"
            disabled={disabled}
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Align right"
            disabled={disabled}
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Justify"
            disabled={disabled}
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <AlignJustify className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <ToolbarSep />
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Heading 2"
            disabled={disabled}
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Heading 3"
            disabled={disabled}
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <ToolbarSep />
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Bullet list"
            disabled={disabled}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Numbered list"
            disabled={disabled}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Indent"
            disabled={disabled || !editor.can().sinkListItem('listItem')}
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          >
            <IndentIncrease className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Outdent"
            disabled={disabled || !editor.can().liftListItem('listItem')}
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          >
            <IndentDecrease className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md"
            title="Quote"
            disabled={disabled}
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Horizontal rule" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-3.5 w-3.5" />
          </EditorToolbarButton>
        </div>

        <div className="flex flex-wrap items-center gap-0.5">
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Link" disabled={disabled} active={editor.isActive('link')} onClick={setLink}>
            <Link2 className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Insert image" disabled={disabled} onClick={() => imageInputRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Insert video (upload)" disabled={disabled} onClick={() => videoInputRef.current?.click()}>
            <Video className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Insert YouTube" disabled={disabled} onClick={setYoutube}>
            <YoutubeIcon className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <ToolbarSep />
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Clear formatting" disabled={disabled} onClick={() => editor.chain().focus().unsetAllMarks().run()}>
            <RemoveFormatting className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title="Paste plain text" disabled={disabled} onClick={() => void pastePlain()}>
            <ClipboardPaste className="h-3.5 w-3.5" />
          </EditorToolbarButton>
          <EditorToolbarButton
            className="h-8 w-8 rounded-md" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} disabled={disabled} onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </EditorToolbarButton>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPickImage(e)} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => void onPickVideo(e)} />
        </div>
      </div>
      <div className={fullscreen ? 'min-h-0 flex-1 overflow-auto' : ''}>
        <EditorContent editor={editor} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span>{wordCount.toLocaleString()} words</span>
          <span className="text-slate-400">{charCount.toLocaleString()} chars</span>
        </span>
        <span className="text-slate-400">Plain-text counts (submission limits use words)</span>
      </div>
    </div>
  );
}
