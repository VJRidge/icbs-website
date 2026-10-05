import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, FileText, Images, LayoutDashboard, Newspaper } from 'lucide-react';
import AdminCmsNav from '../../AdminCmsNav';
import CarouselPanelResizeHandle from '../../social/carousel/CarouselPanelResizeHandle';
import { useHorizontalPanelResize } from '../../social/carousel/useHorizontalPanelResize';
import type { UserProfile } from '../../../types';
import EditorSideChrome from '../../../../brand/BrandEditorChrome';

type Props = {
  userProfile?: UserProfile | null;
  /** Module / editing bay — rendered below CMS nav inside the scroll area. */
  moduleBay?: ReactNode;
};

const NAV_OPEN_KEY = 'icbs.studio.editorNavOpen';

function readNavOpen(): boolean {
  try {
    return localStorage.getItem(NAV_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

const quickLinkCls =
  'flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-brand-yellow';

/** Collapsed studio menu for the editor: one row of shortcuts so the module fields get the column height. */
function CompactNav({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
      <button
        type="button"
        onClick={onExpand}
        className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        title="Show the full studio menu"
      >
        Menu <ChevronDown size={12} />
      </button>
      <Link to="/admin" className={quickLinkCls} title="Dashboard" aria-label="Dashboard">
        <LayoutDashboard size={15} />
      </Link>
      <Link to="/admin/pages" className={quickLinkCls} title="Pages" aria-label="Pages">
        <FileText size={15} />
      </Link>
      <Link to="/admin/posts" className={quickLinkCls} title="Blog posts" aria-label="Blog posts">
        <Newspaper size={15} />
      </Link>
      <Link to="/admin/media" className={quickLinkCls} title="Media" aria-label="Media">
        <Images size={15} />
      </Link>
      <a href="/" target="_blank" rel="noreferrer" className={quickLinkCls} title="View site" aria-label="View site">
        <ExternalLink size={15} />
      </a>
    </div>
  );
}

/** CMS nav + optional module bay in one height-bound, vertically scrollable left column. */
export default function BlogAdminLeftColumn({ userProfile, moduleBay }: Props) {
  const columnResize = useHorizontalPanelResize({ initial: 300, min: 260, max: 480 });
  const [navOpen, setNavOpenState] = useState(readNavOpen);
  const collapsible = Boolean(moduleBay);

  const setNavOpen = (open: boolean) => {
    setNavOpenState(open);
    try {
      localStorage.setItem(NAV_OPEN_KEY, open ? '1' : '0');
    } catch {
      /* private mode: preference just isn't remembered */
    }
  };

  return (
    <aside
      data-studio-sidebar
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-white/10 bg-[#04190f]"
      style={{ width: columnResize.width }}
    >
      <div className="blog-editor-scroll cms-left-column-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="shrink-0">
          {collapsible && !navOpen ? (
            <CompactNav onExpand={() => setNavOpen(true)} />
          ) : (
            <>
              <AdminCmsNav userProfile={userProfile} />
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 border-b border-white/10 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 transition-colors hover:text-brand-yellow"
                >
                  <ChevronDown size={12} className="rotate-180" /> Hide menu while editing
                </button>
              ) : null}
            </>
          )}
        </div>
        {moduleBay ? <EditorSideChrome /> : null}
        {moduleBay ? <div className="shrink-0">{moduleBay}</div> : null}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          to="/admin"
          className="block text-center text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-brand-yellow"
        >
          ← Dashboard
        </Link>
      </div>

      <CarouselPanelResizeHandle
        side="right"
        label="Drag to resize left column"
        onPointerDown={columnResize.onPointerDown}
        onPointerMove={columnResize.onPointerMove}
        onPointerUp={columnResize.onPointerUp}
      />
    </aside>
  );
}
