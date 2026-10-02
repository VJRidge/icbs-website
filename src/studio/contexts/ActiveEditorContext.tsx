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

type Ctx = {
  activeEditor: Editor | null;
  setActiveEditor: Dispatch<SetStateAction<Editor | null>>;
  /** TipTap instances for blog paragraph blocks (by block id) so the toolbar can bind before first focus. */
  registerBlogParagraphEditor: (blockId: string, editor: Editor) => void;
  unregisterBlogParagraphEditor: (blockId: string, editor: Editor) => void;
  getBlogParagraphEditor: (blockId: string) => Editor | null;
  /** Bumps when the paragraph registry changes (toolbar should re-resolve). */
  blogParagraphEditorVersion: number;
};

const ActiveEditorContext = createContext<Ctx | null>(null);

export function ActiveEditorProvider({ children }: { children: ReactNode }) {
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [blogParagraphEditorVersion, setBlogParagraphEditorVersion] = useState(0);
  const blogParagraphEditorsRef = useRef<Map<string, Editor>>(new Map());

  const registerBlogParagraphEditor = useCallback((blockId: string, editor: Editor) => {
    blogParagraphEditorsRef.current.set(blockId, editor);
    setBlogParagraphEditorVersion((v) => v + 1);
  }, []);

  const unregisterBlogParagraphEditor = useCallback((blockId: string, editor: Editor) => {
    if (blogParagraphEditorsRef.current.get(blockId) === editor) {
      blogParagraphEditorsRef.current.delete(blockId);
      setBlogParagraphEditorVersion((v) => v + 1);
    }
  }, []);

  const getBlogParagraphEditor = useCallback((blockId: string) => {
    const ed = blogParagraphEditorsRef.current.get(blockId);
    return ed && !ed.isDestroyed ? ed : null;
  }, []);

  const value = useMemo(
    () => ({
      activeEditor,
      setActiveEditor,
      registerBlogParagraphEditor,
      unregisterBlogParagraphEditor,
      getBlogParagraphEditor,
      blogParagraphEditorVersion,
    }),
    [
      activeEditor,
      registerBlogParagraphEditor,
      unregisterBlogParagraphEditor,
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
      getBlogParagraphEditor: () => null as Editor | null,
      blogParagraphEditorVersion: 0,
    };
  }
  return ctx;
}
