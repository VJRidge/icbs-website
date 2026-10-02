import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useBlogEditorStore } from '../lib/blog/useBlogEditorStore';

export type BlogEditorSidebarTab = 'post' | 'module';

type BlogEditorSidebarContextValue = {
  tab: BlogEditorSidebarTab;
  setTab: (tab: BlogEditorSidebarTab) => void;
  /** Select a block and open the Module sidebar tab (image tools, overlay, etc.). */
  openModuleForBlock: (blockId: string) => void;
};

const BlogEditorSidebarContext = createContext<BlogEditorSidebarContextValue | null>(null);

export function BlogEditorSidebarProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<BlogEditorSidebarTab>('post');

  const openModuleForBlock = useCallback((blockId: string) => {
    useBlogEditorStore.getState().selectBlock(blockId);
  }, []);

  const value = useMemo(
    () => ({
      tab,
      setTab,
      openModuleForBlock,
    }),
    [tab, openModuleForBlock],
  );

  return <BlogEditorSidebarContext.Provider value={value}>{children}</BlogEditorSidebarContext.Provider>;
}

export function useBlogEditorSidebar(): BlogEditorSidebarContextValue {
  const ctx = useContext(BlogEditorSidebarContext);
  if (!ctx) {
    throw new Error('useBlogEditorSidebar must be used within BlogEditorSidebarProvider');
  }
  return ctx;
}

/** Safe for shared components (e.g. block list) when the provider is optional. */
export function useBlogEditorSidebarOptional(): BlogEditorSidebarContextValue | null {
  return useContext(BlogEditorSidebarContext);
}
