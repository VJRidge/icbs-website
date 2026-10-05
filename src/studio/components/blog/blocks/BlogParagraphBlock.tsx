import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { blogParagraphExtensions } from '../../../lib/blog/blogParagraphExtensions';
import {
  paragraphBlockWrapperClass,
  paragraphBlockWrapperStyle,
} from '../../../lib/blog/blogParagraphBlockStyle';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { useActiveEditor } from '../../../contexts/ActiveEditorContext';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';
import { attachToolbarSelectionMemory, freezeToolbarEditorSelection, saveToolbarEditorSelection } from '../../../lib/tiptapTextStyleCommands';
import CanvasLiveText from '../../../../brand/CanvasLiveText';

const TIPTAP_PROSE_CLASS =
  'tiptap prose prose-slate max-w-none min-h-[140px] px-1 py-1 leading-relaxed focus:outline-none prose-headings:font-black prose-headings:text-brand-blue prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base prose-p:text-[17px] prose-p:font-medium prose-li:marker:text-slate-400 prose-blockquote:border-l-4 prose-blockquote:border-brand-blue prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-slate-700';

const CANVAS_TYPE_CLASS = 'tiptap vj-canvas-type max-w-none min-h-[1.2em] px-0 py-0 leading-relaxed focus:outline-none';

/** Turn stored nbsp entities into a normal space without changing the words. */
function decodeSpaces(html: string): string {
  return html
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#0*160;/gi, ' ')
    .replace(/&#x0*a0;/gi, ' ')
    .replace(/\u00a0/g, ' ');
}

/** Plain brand copy: keep a space where a paragraph or break used to be, and decode entities. */
function readablePlain(html: string): string {
  const spaced = decodeSpaces(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'");
  return spaced.replace(/[ \t]{2,}/g, ' ').trim();
}

function BlogParagraphBlockEdit({
  block,
  toolbarSource = true,
  canvasSurface = false,
  autoFocus = false,
}: {
  block: BlogBlock;
  toolbarSource?: boolean;
  canvasSurface?: boolean;
  autoFocus?: boolean;
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { setActiveEditor, registerBlogParagraphEditor, unregisterBlogParagraphEditor } = useActiveEditor();
  const data = block.data as Record<string, unknown>;
  const hasBlockTextColor = Boolean(String(data.textColor ?? '').trim());
  /** Skip setContent when this editor instance just wrote block.data.text (prevents sync loops). */
  const skipExternalSyncRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blogParagraphExtensions('Start writing…'),
    content: decodeSpaces(String(block.data.text ?? '')) || '<p></p>',
    editable: true,
    editorProps: {
      attributes: {
        class: `${canvasSurface ? CANVAS_TYPE_CLASS : TIPTAP_PROSE_CLASS}${hasBlockTextColor ? '' : ' text-slate-700'}`,
      },
      transformPastedHTML(html) {
        return html
          .replace(/<\?xml[^>]*>/gi, '')
          .replace(/<\/?w:[^>]*>/gi, '')
          .replace(/<\/?m:[^>]*>/gi, '')
          .replace(/<\/?o:p[^>]*>/gi, '')
          .replace(/\sclass="[^"]*Mso[^"]*"/gi, '')
          .replace(/\sstyle="[^"]*mso-[^"]*"/gi, '')
          .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
      },
    },
    onUpdate: ({ editor: ed }) => {
      skipExternalSyncRef.current = true;
      updateBlock(block.id, { text: ed.getHTML() });
    },
  });

  useEffect(() => {
    if (!editor || !toolbarSource) return;
    registerBlogParagraphEditor(block.id, editor);
    const detachSelectionMemory = attachToolbarSelectionMemory(editor);

    const rememberHighlight = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) saveToolbarEditorSelection(editor);
    };
    const dom = editor.view.dom;
    dom.addEventListener('mouseup', rememberHighlight);
    dom.addEventListener('keyup', rememberHighlight);

    const onBlurToToolbar = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && document.querySelector('[data-blog-editor-chrome]')?.contains(next)) {
        saveToolbarEditorSelection(editor);
        freezeToolbarEditorSelection(editor);
      }
    };
    dom.addEventListener('blur', onBlurToToolbar, true);

    return () => {
      dom.removeEventListener('mouseup', rememberHighlight);
      dom.removeEventListener('keyup', rememberHighlight);
      dom.removeEventListener('blur', onBlurToToolbar, true);
      detachSelectionMemory();
      unregisterBlogParagraphEditor(block.id, editor);
    };
  }, [editor, block.id, toolbarSource, registerBlogParagraphEditor, unregisterBlogParagraphEditor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    try {
      if (editor.view.dom.contains(document.activeElement)) return;
    } catch {
      return;
    }
    const next = decodeSpaces(String(block.data.text ?? '')) || '<p></p>';
    if (next === editor.getHTML()) return;

    // Preserve caret/highlight across external HTML sync so toolbar styles stick.
    const { from, to } = editor.state.selection;
    const frozen = { from, to };
    // Syncing saved HTML must not run autolink again. A domain such as
    // VettaJimale.Tech would otherwise become a link on every update.
    editor.chain().setMeta('preventAutolink', true).setContent(next, false).run();
    const docSize = editor.state.doc.content.size;
    const safeFrom = Math.max(0, Math.min(frozen.from, docSize));
    const safeTo = Math.max(0, Math.min(frozen.to, docSize));
    if (safeFrom <= safeTo) {
      try {
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      } catch {
        /* ignore invalid restored ranges after structural HTML changes */
      }
    }
  }, [editor, block.data.text]);

  useEffect(() => {
    if (!autoFocus || !editor || editor.isDestroyed) return;
    editor.commands.focus('end');
  }, [autoFocus, editor]);

  useEffect(() => {
    if (!editor) return;
    const focus = () => setActiveEditor(editor);
    editor.on('focus', focus);
    return () => {
      editor.off('focus', focus);
    };
  }, [editor, setActiveEditor]);

  useEffect(() => {
    if (!editor?.view.dom || !(editor.view.dom instanceof HTMLElement)) return;
    editor.view.dom.classList.toggle('text-slate-700', !hasBlockTextColor);
  }, [editor, hasBlockTextColor]);

  return (
    <div className={paragraphBlockWrapperClass(data)} style={paragraphBlockWrapperStyle(data)}>
      <EditorContent editor={editor} />
    </div>
  );
}

export default function BlogParagraphBlock({
  block,
  isEditing,
  toolbarSource = true,
  canvasEdit = false,
  canvasSurface = false,
  autoFocus = false,
}: {
  block: BlogBlock;
  isEditing: boolean;
  toolbarSource?: boolean;
  canvasEdit?: boolean;
  canvasSurface?: boolean;
  autoFocus?: boolean;
}) {
  if (!isEditing) {
    const data = block.data as Record<string, unknown>;
    const role = String(data.role ?? '');
    const plain = readablePlain(String(block.data.text ?? ''));
    if (canvasEdit && (role === 'lede' || role === 'copy' || role === 'note')) {
      return (
        <CanvasLiveText
          blockId={block.id}
          text={plain}
          as="p"
          html
          className={role === 'lede' ? 'lede' : role === 'note' ? 'vj-note' : undefined}
        />
      );
    }
    if (role === 'lede' || role === 'copy' || role === 'note') {
      const className = role === 'lede' ? 'lede' : role === 'note' ? 'vj-note' : undefined;
      return <p className={className}>{plain}</p>;
    }
    const hasBlockTextColor = Boolean(String(data.textColor ?? '').trim());
    return (
      <div
        className={`${paragraphBlockWrapperClass(data)} prose prose-slate max-w-none font-medium leading-relaxed prose-headings:font-black prose-headings:text-brand-blue prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base prose-p:text-[17px] prose-p:leading-[1.75]${hasBlockTextColor ? '' : ' text-slate-700'}`}
        style={paragraphBlockWrapperStyle(data)}
        dangerouslySetInnerHTML={{ __html: sanitizeBlogBlockHtml(decodeSpaces(String(block.data.text ?? ''))) }}
      />
    );
  }
  return (
    <BlogParagraphBlockEdit
      key={block.id}
      block={block}
      toolbarSource={toolbarSource}
      canvasSurface={canvasSurface}
      autoFocus={autoFocus}
    />
  );
}
