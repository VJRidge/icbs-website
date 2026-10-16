import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Editor } from '@tiptap/core';
import { pickFocusedEditor } from '../lib/blog/blogEditorFocus';

type Ctx = {
  activeEditor: Editor | null;
  setActiveEditor: Dispatch<SetStateAction<Editor | null>>;
  /** TipTap instances for blog paragraph blocks (by block id) so the toolbar can bind before first focus. */
  registerBlogParagraphEditor: (blockId: string, editor: Editor) => void;
  unregisterBlogParagraphEditor: (blockId: string, editor: Editor) => void;
  markBlogEditorFocused: (blockId: string, editor: Editor) => void;
  getBlogParagraphEditor: (blockId: string) => Editor | null;
  /** Bumps when the paragraph registry changes (toolbar should re-resolve). */
  blogParagraphEditorVersion: number;
};

const ActiveEditorContext = createContext<Ctx | null>(null);

function living(editors: Editor[]): Editor[] {
  return editors.filter((editor) => !editor.isDestroyed);
}

export function ActiveEditorProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [blogParagraphEditorVersion, setBlogParagraphEditorVersion] = useState(0);
  const blogParagraphEditorsRef = useRef<Map<string, Editor[]>>(new Map());
  const lastFocusedRef = useRef<Map<string, Editor>>(new Map());

  const bump = useCallback(() => setBlogParagraphEditorVersion((v) => v + 1), []);

  const registerBlogParagraphEditor = useCallback(
    (blockId: string, editor: Editor) => {
      const current = blogParagraphEditorsRef.current.get(blockId) ?? [];
      if (!current.includes(editor)) {
        blogParagraphEditorsRef.current.set(blockId, [...current, editor]);
        bump();
      }
    },
    [bump],
  );

  const unregisterBlogParagraphEditor = useCallback(
    (blockId: string, editor: Editor) => {
      const current = blogParagraphEditorsRef.current.get(blockId) ?? [];
      const next = current.filter((item) => item !== editor);
      if (next.length === current.length) return;
      if (next.length) blogParagraphEditorsRef.current.set(blockId, next);
      else blogParagraphEditorsRef.current.delete(blockId);
      if (lastFocusedRef.current.get(blockId) === editor) lastFocusedRef.current.delete(blockId);
      bump();
    },
    [bump],
  );

  const markBlogEditorFocused = useCallback(
    (blockId: string, editor: Editor) => {
      lastFocusedRef.current.set(blockId, editor);
      setActiveEditor(editor);
      bump();
    },
    [bump],
  );

  const getBlogParagraphEditor = useCallback((blockId: string) => {
    const editors = living(blogParagraphEditorsRef.current.get(blockId) ?? []);
    return pickFocusedEditor(
      editors.map((editor) => {
        let hasFocus = false;
        try {
          hasFocus = editor.view.hasFocus();
        } catch {
          hasFocus = false;
        }
        return { editor, hasFocus };
      }),
      lastFocusedRef.current.get(blockId) ?? null,
    );
  }, []);

  const value = useMemo(
    () => ({
      activeEditor,
      setActiveEditor,
      registerBlogParagraphEditor,
      unregisterBlogParagraphEditor,
      markBlogEditorFocused,
      getBlogParagraphEditor,
      blogParagraphEditorVersion,
    }),
    [
      activeEditor,
      registerBlogParagraphEditor,
      unregisterBlogParagraphEditor,
      markBlogEditorFocused,
      getBlogParagraphEditor,
      blogParagraphEditorVersion,
    ],
  );

  return <ActiveEditorContext.Provider value={value}>{children}</ActiveEditorContext.Provider>;
}

export function useActiveEditor() {
  const ctx = useContext(ActiveEditorContext);
  if (!ctx) {
    const noop = () => {};
    return {
      activeEditor: null as Editor | null,
      setActiveEditor: noop as Dispatch<SetStateAction<Editor | null>>,
      registerBlogParagraphEditor: noop as (blockId: string, editor: Editor) => void,
      unregisterBlogParagraphEditor: noop as (blockId: string, editor: Editor) => void,
      markBlogEditorFocused: noop as (blockId: string, editor: Editor) => void,
      getBlogParagraphEditor: () => null as Editor | null,
      blogParagraphEditorVersion: 0,
    };
  }
  return ctx;
}
