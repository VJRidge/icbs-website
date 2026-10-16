import { useEffect, useRef, type ReactNode } from 'react';
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
import { lightboxCopyStyle, lightboxHtml } from '../../../lib/blog/lightboxNote';
import SurfaceBackgroundLayers from '../SurfaceBackgroundLayers';
import { hasSurfaceLayers, readSurfaceBackground, surfaceShellStyle } from '../../../lib/blog/surfaceBackground';
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

function wrapParagraphSurface(data: Record<string, unknown>, htmlKey: string, node: ReactNode) {
  if (htmlKey === 'body') return node;
  const surface = readSurfaceBackground(data);
  if (!surface.type) return node;
  return (
    <div className="vj-surface" style={surfaceShellStyle(surface)}>
      {hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
      {node}
    </div>
  );
}

function BlogParagraphBlockEdit({
  block,
  toolbarSource = true,
  canvasSurface = false,
  autoFocus = false,
  htmlKey = 'text',
}: {
  block: BlogBlock;
  toolbarSource?: boolean;
  canvasSurface?: boolean;
  autoFocus?: boolean;
  htmlKey?: string;
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { setActiveEditor, registerBlogParagraphEditor, unregisterBlogParagraphEditor, markBlogEditorFocused } =
    useActiveEditor();
  const data = block.data as Record<string, unknown>;
  const hasBlockTextColor = Boolean(String(data.textColor ?? '').trim());
  /** Skip setContent when this editor instance just wrote block.data.text (prevents sync loops). */
  const skipExternalSyncRef = useRef(false);
  const storedRaw = String(block.data[htmlKey] ?? block.data.text ?? '');
  const htmlValue =
    decodeSpaces(htmlKey === 'body' ? lightboxHtml({ body: storedRaw }) : storedRaw) || '<p></p>';

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blogParagraphExtensions('Start writing…'),
    content: htmlValue,
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
      const html = ed.getHTML();
      updateBlock(block.id, htmlKey === 'body' ? { body: html, text: html, paragraphs: [] } : { text: html });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (!toolbarSource && !canvasSurface) return;
    registerBlogParagraphEditor(block.id, editor);
    const detachSelectionMemory = attachToolbarSelectionMemory(editor);

    const rememberHighlight = () => {
      if (editor.view.hasFocus()) saveToolbarEditorSelection(editor);
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
    const onFocus = () => {
      markBlogEditorFocused(block.id, editor);
      saveToolbarEditorSelection(editor);
    };
    editor.on('focus', onFocus);
    dom.addEventListener('blur', onBlurToToolbar, true);

    return () => {
      editor.off('focus', onFocus);
      dom.removeEventListener('mouseup', rememberHighlight);
      dom.removeEventListener('keyup', rememberHighlight);
      dom.removeEventListener('blur', onBlurToToolbar, true);
      detachSelectionMemory();
      unregisterBlogParagraphEditor(block.id, editor);
    };
  }, [
    editor,
    block.id,
    toolbarSource,
    canvasSurface,
    registerBlogParagraphEditor,
    unregisterBlogParagraphEditor,
    markBlogEditorFocused,
  ]);

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
    const nextRaw = String(block.data[htmlKey] ?? block.data.text ?? '');
    const next = decodeSpaces(htmlKey === 'body' ? lightboxHtml({ body: nextRaw }) : nextRaw) || '<p></p>';
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
  }, [editor, htmlKey, htmlValue]);

  useEffect(() => {
    if (!autoFocus || !editor || editor.isDestroyed) return;
    editor.commands.focus('end');
  }, [autoFocus, editor]);

  useEffect(() => {
    if (!editor) return;
    const focus = () => {
      setActiveEditor(editor);
      markBlogEditorFocused(block.id, editor);
    };
    editor.on('focus', focus);
    return () => {
      editor.off('focus', focus);
    };
  }, [editor, block.id, setActiveEditor, markBlogEditorFocused]);

  useEffect(() => {
    if (!editor?.view.dom || !(editor.view.dom instanceof HTMLElement)) return;
    editor.view.dom.classList.toggle('text-slate-700', !hasBlockTextColor);
  }, [editor, hasBlockTextColor]);

  const surface = htmlKey === 'body' ? null : readSurfaceBackground(data);
  return (
    <div
      className={`${paragraphBlockWrapperClass(data)}${surface?.type ? ' vj-surface' : ''}`}
      style={{
        ...(htmlKey === 'body' ? lightboxCopyStyle(data) : paragraphBlockWrapperStyle(data)),
        ...(surface ? surfaceShellStyle(surface) : {}),
      }}
    >
      {surface && hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
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
  htmlKey = 'text',
}: {
  block: BlogBlock;
  isEditing: boolean;
  toolbarSource?: boolean;
  canvasEdit?: boolean;
  canvasSurface?: boolean;
  autoFocus?: boolean;
  htmlKey?: string;
}) {
  if (!isEditing) {
    const data = block.data as Record<string, unknown>;
    const storedHtml = String(block.data[htmlKey] ?? block.data.text ?? '');
    const role = String(data.role ?? '');
    const plain = readablePlain(storedHtml);
    if (canvasEdit && (role === 'lede' || role === 'copy' || role === 'note')) {
      return wrapParagraphSurface(
        data,
        htmlKey,
        <CanvasLiveText
          blockId={block.id}
          text={plain}
          as="p"
          html
          className={role === 'lede' ? 'lede' : role === 'note' ? 'vj-note' : undefined}
        />,
      );
    }
    if (role === 'lede' || role === 'copy' || role === 'note') {
      const className = role === 'lede' ? 'lede' : role === 'note' ? 'vj-note' : undefined;
      return wrapParagraphSurface(data, htmlKey, <p className={className}>{plain}</p>);
    }
    const hasBlockTextColor = Boolean(String(data.textColor ?? '').trim());
    const surface = htmlKey === 'body' ? null : readSurfaceBackground(data);
    return (
      <div
        className={`${paragraphBlockWrapperClass(data)} prose prose-slate max-w-none font-medium leading-relaxed prose-headings:font-black prose-headings:text-brand-blue prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl prose-h4:text-xl prose-h5:text-lg prose-h6:text-base prose-p:text-[17px] prose-p:leading-[1.75]${hasBlockTextColor ? '' : ' text-slate-700'}${surface?.type ? ' vj-surface' : ''}`}
        style={{ ...paragraphBlockWrapperStyle(data), ...(surface ? surfaceShellStyle(surface) : {}) }}
      >
        {surface && hasSurfaceLayers(surface) ? <SurfaceBackgroundLayers bg={surface} /> : null}
        <div
          className="blog-paragraph-html"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogBlockHtml(decodeSpaces(storedHtml)) }}
        />
      </div>
    );
  }
  return (
    <BlogParagraphBlockEdit
      key={block.id}
      block={block}
      toolbarSource={toolbarSource}
      canvasSurface={canvasSurface}
      autoFocus={autoFocus}
      htmlKey={htmlKey}
    />
  );
}
