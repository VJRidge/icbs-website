import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import AdminCmsNav from '../../AdminCmsNav';
import CarouselPanelResizeHandle from '../../social/carousel/CarouselPanelResizeHandle';
import { useHorizontalPanelResize } from '../../social/carousel/useHorizontalPanelResize';
import type { UserProfile } from '../../../types';

type Props = {
  userProfile?: UserProfile | null;
  /** Module / editing bay — rendered below CMS nav inside the scroll area. */
  moduleBay?: ReactNode;
};

/** CMS nav + optional module bay in one height-bound, vertically scrollable left column. */
export default function BlogAdminLeftColumn({ userProfile, moduleBay }: Props) {
  const columnResize = useHorizontalPanelResize({ initial: 300, min: 260, max: 480 });

  return (
    <aside
      className="relative flex h-full min-h-0 shrink-0 flex-col border-r border-white/10 bg-[#04190f]"
      style={{ width: columnResize.width }}
    >
      <div className="blog-editor-scroll cms-left-column-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <div className="shrink-0">
          <AdminCmsNav userProfile={userProfile} />
        </div>
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
