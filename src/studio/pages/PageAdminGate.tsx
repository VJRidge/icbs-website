import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { managedPublicPageById, managedPublicPageBySlug } from '../../lib/site/managedPublicPages';
import { supabase } from '../lib/supabase';
import PublisherPageAdminPage from './PublisherPageAdminPage';
import type { UserProfile } from '../types';

/**
 * Normal pages → block editor.
 * Managed public surfaces → adminEditPath when set, otherwise the live publicPath
 * (e.g. Templates page opens /resources/templates, not the starters admin).
 */
export default function PageAdminGate({ userProfile }: { userProfile: UserProfile | null }) {
  const { pageId } = useParams();
  const known = managedPublicPageById(pageId);
  const [redirectTo, setRedirectTo] = useState<string | null>(
    known?.adminEditPath ?? (known && !known.adminEditPath ? known.publicPath : null),
  );
  const [ready, setReady] = useState(!!known || pageId === 'new');

  useEffect(() => {
    if (!pageId || pageId === 'new' || known) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void supabase
      .from('contents')
      .select('slug')
      .eq('id', pageId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const managed = managedPublicPageBySlug(data?.slug);
        if (managed?.adminEditPath) setRedirectTo(managed.adminEditPath);
        else if (managed) setRedirectTo(managed.publicPath);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pageId, known]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#F3EDE3] text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (redirectTo) {
    if (redirectTo.startsWith('/admin/')) {
      const [pathname, hash] = redirectTo.split('#');
      return <Navigate to={hash ? { pathname, hash } : pathname} replace />;
    }
    window.location.replace(redirectTo);
    return null;
  }

  return <PublisherPageAdminPage userProfile={userProfile} />;
}
