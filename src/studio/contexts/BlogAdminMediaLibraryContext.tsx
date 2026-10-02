import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { LandingMediaPicker } from '../components/LandingMediaPicker';

type Ctx = {
  openMediaLibrary: (onPick: (url: string) => void) => void;
};

const BlogAdminMediaLibraryContext = createContext<Ctx | null>(null);

export function BlogAdminMediaLibraryProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const applyRef = useRef<((url: string) => void) | null>(null);

  const openMediaLibrary = useCallback((onPick: (url: string) => void) => {
    applyRef.current = onPick;
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    applyRef.current = null;
    setOpen(false);
  }, []);

  const handlePick = useCallback((url: string) => {
    const fn = applyRef.current;
    applyRef.current = null;
    setOpen(false);
    fn?.(url);
  }, []);

  const value: Ctx = { openMediaLibrary };

  return (
    <BlogAdminMediaLibraryContext.Provider value={value}>
      {children}
      {userId ? (
        <LandingMediaPicker
          open={open}
          userId={userId}
          onClose={handleClose}
          onPick={handlePick}
          title="Media library"
          subtitle="Images, videos, and audio in your landing-media folder (same as landing page & events)."
          overlayZClass="z-[240]"
        />
      ) : null}
    </BlogAdminMediaLibraryContext.Provider>
  );
}

export function useBlogAdminMediaLibrary(): Ctx {
  const ctx = useContext(BlogAdminMediaLibraryContext);
  return ctx ?? { openMediaLibrary: () => {} };
}
