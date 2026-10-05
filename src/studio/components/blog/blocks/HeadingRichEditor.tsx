import { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { headingEditorHtml } from '../../../../brand/headingHighlight';
import { useActiveEditor } from '../../../contexts/ActiveEditorContext';
import { findBlockInTree } from '../../../lib/blog/blogBlockTree';
import { blogParagraphExtensions } from '../../../lib/blog/blogParagraphExtensions';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { attachToolbarSelectionMemory, freezeToolbarEditorSelection, saveToolbarEditorSelection } from '../../../lib/tiptapTextStyleCommands';

const PANEL_CLASS =
  'tiptap vj-heading-panel max-w-none min-h-[4.5rem] rounded-lg border border-slate-200 px-3 py-2 text-base leading-snug text-slate-800 focus:outline-none [&_p]:m-0 [&_mark]:whitespace-nowrap [&_mark]:!text-[#151412]';

const CANVAS_CLASS = 'tiptap vj-heading-editor max-w-none min-h-[1.2em] px-0 py-0 focus:outline-none';

function headingFields(block: BlogBlock) {
  return {
    text: String(block.data.text ?? ''),
    highlight: String(block.data.highlight ?? ''),
    highlightColor: String(block.data.highlightColor ?? ''),
  };
}

/** One TipTap for the heading. The left panel is the toolbar source; the canvas only follows it. */
export default function HeadingRichEditor({
  block,
  toolbarSource = false,
  canvasSurface = false,
}: {
  block: BlogBlock;
  toolbarSource?: boolean;
  canvasSurface?: boolean;
}) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const { setActiveEditor, registerBlogParagraphEditor, unregisterBlogParagraphEditor } = useActiveEditor();
  const skipExternalSyncRef = useRef(false);
  const readyRef = useRef(false);
  const fields = headingFields(block);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: blogParagraphExtensions(canvasSurface ? '' : 'Heading'),
    content: headingEditorHtml(fields.text, fields.highlight, fields.highlightColor),
    editable: true,
    editorProps: {
      attributes: {
        class: canvasSurface ? CANVAS_CLASS : PANEL_CLASS,
        spellcheck: 'true',
      },
    },
    onCreate: () => {
      requestAnimationFrame(() => {
        readyRef.current = true;
      });
    },
    onUpdate: ({ editor: ed, transaction }) => {
      if (!readyRef.current || transaction.getMeta('preventUpdate')) return;
      const html = ed.getHTML();
      const live = findBlockInTree(useBlogEditorStore.getState().blocks, block.id);
      if (String(live?.data.text ?? '') === html) return;
      skipExternalSyncRef.current = true;
      updateBlock(block.id, { text: html });
    },
  });

  useEffect(() => {
    if (!editor || !toolbarSource) return;
    registerBlogParagraphEditor(block.id, editor);
    const detachSelectionMemory = attachToolbarSelectionMemory(editor);
    const dom = editor.view.dom;
    const rememberHighlight = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) saveToolbarEditorSelection(editor);
    };
    const onBlurToToolbar = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && document.querySelector('[data-blog-editor-chrome]')?.contains(next)) {
        saveToolbarEditorSelection(editor);
        freezeToolbarEditorSelection(editor);
      }
    };
    dom.addEventListener('mouseup', rememberHighlight);
    dom.addEventListener('keyup', rememberHighlight);
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
    const next = headingEditorHtml(fields.text, fields.highlight, fields.highlightColor);
    if (next === editor.getHTML()) return;
    const { from, to } = editor.state.selection;
    // Do not autolink domains again while this editor follows saved HTML.
    editor.chain().setMeta('preventAutolink', true).setContent(next, false).run();
    const docSize = editor.state.doc.content.size;
    const safeFrom = Math.max(0, Math.min(from, docSize));
    const safeTo = Math.max(0, Math.min(to, docSize));
    if (safeFrom <= safeTo) {
      try {
        editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
      } catch {
        /* range can shrink when the phrase wrap changes the document */
      }
    }
  }, [editor, fields.text, fields.highlight, fields.highlightColor]);

  useEffect(() => {
    if (!editor) return;
    const focus = () => setActiveEditor(editor);
    editor.on('focus', focus);
    return () => {
      editor.off('focus', focus);
    };
  }, [editor, setActiveEditor]);

  return <EditorContent editor={editor} />;
}
