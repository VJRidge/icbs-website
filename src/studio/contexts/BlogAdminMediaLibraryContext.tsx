import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { LandingMediaPicker } from '../components/LandingMediaPicker';

type Ctx = {
  openMediaLibrary: (onPick: (url: string) => void, label?: string) => void;
};

const BlogAdminMediaLibraryContext = createContext<Ctx | null>(null);

export function BlogAdminMediaLibraryProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const applyRef = useRef<((url: string) => void) | null>(null);

  const openMediaLibrary = useCallback((onPick: (url: string) => void, nextLabel?: string) => {
    applyRef.current = onPick;
    setLabel(nextLabel?.trim() ?? '');
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    applyRef.current = null;
    setLabel('');
    setOpen(false);
  }, []);

  const handlePick = useCallback((url: string) => {
    const fn = applyRef.current;
    applyRef.current = null;
    setLabel('');
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
          title={label ? `Choose ${label}` : 'Media library'}
          subtitle={label ? `Upload a new file or pick one already in the library. It will be used for ${label}.` : 'Images, videos, and audio in your media folder.'}
          purpose={label}
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
