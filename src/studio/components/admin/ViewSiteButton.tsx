import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { HOMEPAGE_CHANGED, resolveViewSitePath } from '../../lib/cms/viewSite';

type Props = {
  className: string;
  title?: string;
  /** When set (editor), open this page instead of looking up the site homepage. */
  href?: string;
  children: ReactNode;
};

async function loadViewSiteHref(): Promise<string> {
  const { data: settings } = await supabase
    .from('settings')
    .select('homepage_content_id, draft_document')
    .eq('id', 1)
    .maybeSingle();
  const liveHomepageId = (settings?.homepage_content_id as string | null) ?? null;
  const draft = settings?.draft_document as { homepage_content_id?: string | null } | null;
  const draftHomepageId = draft?.homepage_content_id ? String(draft.homepage_content_id) : null;
  const id = liveHomepageId || draftHomepageId;
  if (!id) return '/';
  const { data: page } = await supabase.from('contents').select('id, slug, kind, status').eq('id', id).maybeSingle();
  return resolveViewSitePath({
    liveHomepageId,
    draftHomepageId,
    pages: page ? [{ id: page.id, slug: page.slug, kind: page.kind, status: page.status }] : [],
  });
}

/** Opens the current homepage assignment, not a hardcoded URL. */
export default function ViewSiteButton({ className, title = 'View site', href, children }: Props) {
  const [resolved, setResolved] = useState(href || '/');

  useEffect(() => {
    if (href) {
      setResolved(href);
      return;
    }
    void loadViewSiteHref().then(setResolved);
    const onFocus = () => {
      void loadViewSiteHref().then(setResolved);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener(HOMEPAGE_CHANGED, onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(HOMEPAGE_CHANGED, onFocus);
    };
  }, [href]);

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noreferrer"
      className={className}
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
          return;
        }
        void loadViewSiteHref().then((next) => {
          setResolved(next);
          window.open(next, '_blank', 'noopener,noreferrer');
        });
      }}
    >
      {children}
    </a>
  );
}
