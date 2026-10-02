import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  Underline,
  Strikethrough,
  Subscript as SubIcon,
  Superscript as SupIcon,
  Code,
  Link2,
  List,
  ListOrdered,
  ListChecks,
  Outdent,
  Indent,
  Minus,
  Quote,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Table,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  WrapText,
  Search,
  Smile,
  Type,
} from 'lucide-react';
import { useActiveEditor } from '../../../contexts/ActiveEditorContext';
import { findBlockInTree } from '../../../lib/blog/blogBlockTree';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import { supabase } from '../../../lib/supabase';
import { uploadLandingMedia } from '../../../lib/landingEditorUploadShared';
import { RichEditorFontControls } from '../../RichEditorFontControls';
import { RichEditorHighlightDropdown } from '../../RichEditorColorMenus';
import {
  applyEditorHighlight,
  freezeToolbarEditorSelection,
  isBoldActiveInSelection,
  saveToolbarEditorSelection,
} from '../../../lib/tiptapTextStyleCommands';
import BlogToolbarTextColorPicker from './BlogToolbarTextColorPicker';
import BlogLinkDialog from './BlogLinkDialog';
import BlogFindReplaceDialog from './BlogFindReplaceDialog';

const LINE_HEIGHTS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: 'Tight', value: '1.25' },
  { label: 'Normal', value: '1.5' },
  { label: 'Relaxed', value: '1.75' },
  { label: 'Loose', value: '2' },
];

const LETTER_SPACING: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: 'Tight', value: '-0.02em' },
  { label: 'Wide', value: '0.05em' },
  { label: 'Wider', value: '0.1em' },
];

// Skin-tone-bearing entries default to Fitzpatrick Type 6 so the
// platform's quick-insert palette reflects the HBCU community it
// serves. Authors can still type any tone they prefer inline.
const EMOJI_ROW = ['😀', '😃', '😄', '😁', '🙌🏿', '👏🏿', '🔥', '✨', '❤️', '💛', '🎓', '🏀', '📣', '✅', '⭐'];

const SPECIAL_CHARS = [
  { label: 'Em dash', ch: '—' },
  { label: 'Ellipsis', ch: '…' },
  { label: 'Copyright', ch: '©' },
  { label: 'Registered', ch: '®' },
  { label: 'Trademark', ch: '™' },
  { label: 'Nbsp', ch: '\u00A0' },
];

/** Toolbar for the selected paragraph block’s canvas TipTap instance. */
export default function BlogFormatToolbar() {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const selectedBlockId = useBlogEditorStore((s) => s.selectedBlockId);
  const { activeEditor, getBlogParagraphEditor, blogParagraphEditorVersion } = useActiveEditor();

  const ed = useMemo(() => {
    if (selectedBlockId) {
      const block = findBlockInTree(blocks, selectedBlockId);
      if (block?.type === 'paragraph') {
        const canvasEditor = getBlogParagraphEditor(selectedBlockId);
        if (canvasEditor && !canvasEditor.isDestroyed) return canvasEditor;
      }
    }
    const candidate = activeEditor;
    if (!candidate || candidate.isDestroyed) return null;
    return candidate;
  }, [blocks, selectedBlockId, getBlogParagraphEditor, activeEditor, blogParagraphEditorVersion]);

  const [, tick] = useState(0);
  const [toolbarUserId, setToolbarUserId] = useState<string | null>(null);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const [linkOpen, setLinkOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setToolbarUserId(data.session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ed) return;
    const fn = () => tick((n) => n + 1);
    ed.on('transaction', fn);
    ed.on('selectionUpdate', fn);
    return () => {
      ed.off('transaction', fn);
      ed.off('selectionUpdate', fn);
    };
  }, [ed]);

  /** Capture canvas selection before any toolbar control steals focus (capture phase). */
  useEffect(() => {
    if (!ed) return;
    const root = document.querySelector('[data-blog-editor-chrome]');
    if (!root) return;
    const captureSelection = () => {
      saveToolbarEditorSelection(ed);
      freezeToolbarEditorSelection(ed);
    };
    root.addEventListener('mousedown', captureSelection, true);
    root.addEventListener('pointerdown', captureSelection, true);
    return () => {
      root.removeEventListener('mousedown', captureSelection, true);
      root.removeEventListener('pointerdown', captureSelection, true);
    };
  }, [ed]);

  const counts =
    ed?.storage.characterCount && typeof ed.storage.characterCount === 'object'
      ? {
          chars: (ed.storage.characterCount as { characters: () => number }).characters(),
          words: (ed.storage.characterCount as { words: () => number }).words(),
        }
      : null;

  const Btn = ({
    label,
    active,
    onPress,
    children,
    disabled,
  }: {
    label: string;
    active?: boolean;
    onPress: () => void;
    children: ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      title={label}
      disabled={disabled ?? !ed}
      onMouseDown={(e) => {
        e.preventDefault();
        if (ed) {
          saveToolbarEditorSelection(ed);
          onPress();
        }
      }}
      className={`rounded border px-1.5 py-1 text-xs font-bold transition-all select-none ${
        disabled || !ed
          ? 'cursor-not-allowed border-slate-200/80 bg-white/50 text-slate-300'
          : active
            ? 'border-brand-blue bg-brand-blue text-brand-yellow shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue'
      }`}
    >
      {children}
    </button>
  );

  const lhVal =
    ed?.state.selection.$from.parent.attrs.lineHeight &&
    typeof ed.state.selection.$from.parent.attrs.lineHeight === 'string'
      ? String(ed.state.selection.$from.parent.attrs.lineHeight)
      : '';

  const lsAttrs = ed?.getAttributes('textStyle') as { letterSpacing?: string };
  const lsVal = lsAttrs?.letterSpacing ?? '';

  const selectCls =
    'max-w-[9rem] rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:border-brand-blue/50 disabled:opacity-40';

  const divider = <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-300/70" />;

  const ToolRow = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <div className={`flex flex-wrap items-center gap-0.5 ${className}`}>{children}</div>
  );

  const rememberSelection = () => {
    if (ed) saveToolbarEditorSelection(ed);
  };

  /** Keep TipTap focus/selection for toolbar buttons; allow text fields & dropdown panels. */
  const onToolbarChromeMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, option, [data-toolbar-text-input]')) return;
    if (target.closest('[data-toolbar-popover-panel], [data-blog-toolbar-color]')) return;
    e.preventDefault();
  };

  return (
    <>
      <div
        data-blog-editor-chrome
        className="shrink-0 space-y-1 border-b border-slate-200/60 bg-[#F3EDE3] px-2 py-1.5"
        onMouseDown={onToolbarChromeMouseDown}
      >
        <ToolRow>
          <Btn label="Undo" active={false} disabled={!ed?.can().undo()} onPress={() => ed!.chain().focus().undo().run()}>
            <Undo2 size={13} />
          </Btn>
          <Btn label="Redo" active={false} disabled={!ed?.can().redo()} onPress={() => ed!.chain().focus().redo().run()}>
            <Redo2 size={13} />
          </Btn>
          {divider}
          {ed ? (
            <RichEditorFontControls editor={ed} compact />
          ) : (
            <span className="px-1 text-[10px] font-medium text-slate-400">Select a paragraph block</span>
          )}
          {ed ? <BlogToolbarTextColorPicker editor={ed} onApplied={() => tick((n) => n + 1)} /> : null}
          <RichEditorHighlightDropdown
            disabled={!ed}
            size="sm"
            currentHighlightColor={(ed?.getAttributes('highlight') as { color?: string } | undefined)?.color}
            onOpen={rememberSelection}
            onPick={(hex) => {
              if (ed) applyEditorHighlight(ed, hex);
              tick((n) => n + 1);
            }}
            onClear={() => {
              if (ed) applyEditorHighlight(ed, '');
              tick((n) => n + 1);
            }}
          />
          {divider}
          <Btn label="Left" active={ed?.isActive({ textAlign: 'left' })} onPress={() => ed!.chain().focus().setTextAlign('left').run()}>
            <AlignLeft size={13} />
          </Btn>
          <Btn
            label="Center"
            active={ed?.isActive({ textAlign: 'center' })}
            onPress={() => ed!.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter size={13} />
          </Btn>
          <Btn label="Right" active={ed?.isActive({ textAlign: 'right' })} onPress={() => ed!.chain().focus().setTextAlign('right').run()}>
            <AlignRight size={13} />
          </Btn>
          <Btn
            label="Justify"
            active={ed?.isActive({ textAlign: 'justify' })}
            onPress={() => ed!.chain().focus().setTextAlign('justify').run()}
          >
            <AlignJustify size={13} />
          </Btn>
          {divider}
          <Btn label="Bold" active={ed ? isBoldActiveInSelection(ed) : false} onPress={() => ed!.chain().focus().toggleBold().run()}>
            <span className="font-black">B</span>
          </Btn>
          <Btn label="Italic" active={ed?.isActive('italic')} onPress={() => ed!.chain().focus().toggleItalic().run()}>
            <span className="italic font-semibold">I</span>
          </Btn>
          <Btn label="Underline" active={ed?.isActive('underline')} onPress={() => ed!.chain().focus().toggleUnderline().run()}>
            <Underline size={13} strokeWidth={2.5} />
          </Btn>
          <Btn label="Strikethrough" active={ed?.isActive('strike')} onPress={() => ed!.chain().focus().toggleStrike().run()}>
            <Strikethrough size={13} />
          </Btn>
          {divider}
          <Btn
            label="Link"
            active={ed?.isActive('link')}
            onPress={() => {
              setLinkOpen(true);
            }}
          >
            <Link2 size={13} />
          </Btn>
        </ToolRow>

        <ToolRow className="border-t border-slate-200/50 pt-1">
          <label className="flex items-center gap-1 pl-1 text-[10px] font-bold uppercase text-slate-400">
            <Type size={11} />
            Line
          </label>
          <select
            disabled={!ed}
            value={LINE_HEIGHTS.some((o) => o.value === lhVal) ? lhVal : ''}
            onChange={(e) => {
              const v = e.target.value;
              ed?.chain().focus().setBlogLineHeight(v || null).run();
            }}
            className={selectCls}
          >
            {LINE_HEIGHTS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">Spacing</label>
          <select
            disabled={!ed}
            value={LETTER_SPACING.some((o) => o.value === lsVal) ? lsVal : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) ed?.chain().focus().unsetLetterSpacing().run();
              else ed?.chain().focus().setLetterSpacing(v).run();
            }}
            className={selectCls}
          >
            {LETTER_SPACING.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Btn
            label="Indent paragraph"
            active={false}
            onPress={() => ed!.chain().focus().bumpBlogParagraphIndent(1.5).run()}
          >
            <Indent size={13} />
          </Btn>
          <Btn
            label="Outdent paragraph"
            active={false}
            onPress={() => ed!.chain().focus().bumpBlogParagraphIndent(-1.5).run()}
          >
            <Outdent size={13} />
          </Btn>
          {divider}
          <Btn label="Bullet list" active={ed?.isActive('bulletList')} onPress={() => ed!.chain().focus().toggleBulletList().run()}>
            <List size={13} />
          </Btn>
          <Btn label="Ordered list" active={ed?.isActive('orderedList')} onPress={() => ed!.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={13} />
          </Btn>
          <Btn label="Task list" active={ed?.isActive('taskList')} onPress={() => ed!.chain().focus().toggleTaskList().run()}>
            <ListChecks size={13} />
          </Btn>
          <Btn
            label="List indent"
            active={false}
            onPress={() => {
              const e = ed!;
              const chain = e.chain().focus();
              if (e.can().sinkListItem('taskItem')) chain.sinkListItem('taskItem').run();
              else if (e.can().sinkListItem('listItem')) chain.sinkListItem('listItem').run();
            }}
          >
            <Indent size={13} />
          </Btn>
          <Btn
            label="List outdent"
            active={false}
            onPress={() => {
              const e = ed!;
              const chain = e.chain().focus();
              if (e.can().liftListItem('taskItem')) chain.liftListItem('taskItem').run();
              else if (e.can().liftListItem('listItem')) chain.liftListItem('listItem').run();
            }}
          >
            <Outdent size={13} />
          </Btn>
          {divider}
          <Btn label="Subscript" active={ed?.isActive('subscript')} onPress={() => ed!.chain().focus().toggleSubscript().run()}>
            <SubIcon size={13} />
          </Btn>
          <Btn label="Superscript" active={ed?.isActive('superscript')} onPress={() => ed!.chain().focus().toggleSuperscript().run()}>
            <SupIcon size={13} />
          </Btn>
          <Btn label="Inline code" active={ed?.isActive('code')} onPress={() => ed!.chain().focus().toggleCode().run()}>
            <Code size={13} />
          </Btn>
          {divider}
          <Btn label="Block quote" active={ed?.isActive('blockquote')} onPress={() => ed!.chain().focus().toggleBlockquote().run()}>
            <Quote size={13} />
          </Btn>
          <Btn label="Horizontal rule" active={false} onPress={() => ed!.chain().focus().setHorizontalRule().run()}>
            <Minus size={13} />
          </Btn>
          <Btn label="Line break" active={false} onPress={() => ed!.chain().focus().setHardBreak().run()}>
            <WrapText size={13} />
          </Btn>
          <Btn
            label="Table"
            active={false}
            onPress={() => ed!.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <Table size={13} />
          </Btn>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!toolbarUserId || imageUploadBusy || !ed}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || !ed || !toolbarUserId) return;
              setImageUploadBusy(true);
              try {
                const url = await uploadLandingMedia(toolbarUserId, file);
                ed.chain().focus().setImage({ src: url }).run();
              } catch (err) {
                window.alert(err instanceof Error ? err.message : 'Image upload failed');
              } finally {
                setImageUploadBusy(false);
              }
            }}
          />
          <Btn
            label="Insert image from computer"
            active={false}
            disabled={!toolbarUserId || imageUploadBusy}
            onPress={() => imageFileInputRef.current?.click()}
          >
            <ImageIcon size={13} />
          </Btn>
          <Btn
            label="Insert image from media library"
            active={false}
            disabled={!toolbarUserId || !ed}
            onPress={() =>
              openMediaLibrary((url) => {
                ed?.chain().focus().setImage({ src: url }).run();
              })
            }
          >
            <span className="text-[9px] font-black">Lib</span>
          </Btn>
          <Btn
            label="Insert image URL"
            active={false}
            onPress={() => {
              const url = window.prompt('Image URL');
              if (url?.trim()) ed!.chain().focus().setImage({ src: url.trim() }).run();
            }}
          >
            URL
          </Btn>
          <Btn
            label="Insert YouTube"
            active={false}
            onPress={() => {
              const url = window.prompt('YouTube URL');
              if (url?.trim()) ed!.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
            }}
          >
            <YoutubeIcon size={13} />
          </Btn>
          {divider}
          <Btn
            label="Clear formatting"
            active={false}
            onPress={() => {
              ed?.chain().focus().unsetAllMarks().run();
            }}
          >
            <RemoveFormatting size={13} />
          </Btn>
          <Btn label="Find & replace" active={false} onPress={() => setFindOpen(true)}>
            <Search size={13} />
          </Btn>
          <div className="relative">
            <Btn label="Emoji" active={emojiOpen} onPress={() => setEmojiOpen((o) => !o)}>
              <Smile size={13} />
            </Btn>
            {emojiOpen && ed ? (
              <div className="absolute left-0 top-full z-50 mt-1 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {EMOJI_ROW.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="rounded p-1 text-lg hover:bg-slate-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      ed.chain().focus().insertContent(em).run();
                      setEmojiOpen(false);
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <Btn label="Special characters" active={specialOpen} onPress={() => setSpecialOpen((o) => !o)}>
              <span className="text-[11px] font-bold">Ω</span>
            </Btn>
            {specialOpen && ed ? (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {SPECIAL_CHARS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      ed.chain().focus().insertContent(s.ch).run();
                      setSpecialOpen(false);
                    }}
                  >
                    <span className="text-slate-500">{s.label}</span>
                    <span className="font-mono font-bold">{s.ch === '\u00A0' ? 'NBSP' : s.ch}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {counts ? (
            <span className="ml-auto flex flex-wrap items-center gap-2 px-1 text-[10px] text-slate-500">
              <span>
                <span className="font-bold text-slate-700">{counts.words}</span> words
              </span>
              <span className="hidden sm:inline">
                ~<span className="font-bold text-slate-700">{Math.max(1, Math.ceil(counts.words / 200))}</span> min
              </span>
            </span>
          ) : null}
        </ToolRow>
      </div>

      <BlogLinkDialog editor={ed} open={linkOpen} onClose={() => setLinkOpen(false)} />
      <BlogFindReplaceDialog editor={ed} open={findOpen} onClose={() => setFindOpen(false)} />
    </>
  );
}
