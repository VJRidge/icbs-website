import type { ReactNode } from 'react';
import CarouselPanelResizeHandle from '../../social/carousel/CarouselPanelResizeHandle';
import { useHorizontalPanelResize } from '../../social/carousel/useHorizontalPanelResize';

type Props = {
  settingsHeading?: string;
  children: ReactNode;
};

/** Post/page metadata panel on the right side of the editor. */
export default function BlogAdminPostSettingsAside({
  settingsHeading = 'Post settings',
  children,
}: Props) {
  const asideResize = useHorizontalPanelResize({ initial: 320, min: 240, max: 560 });

  return (
    <div className="relative z-20 flex min-h-0 shrink-0" style={{ width: asideResize.width }}>
      <CarouselPanelResizeHandle
        side="left"
        label="Drag to resize settings panel"
        onPointerDown={asideResize.onPointerDown}
        onPointerMove={asideResize.onPointerMove}
        onPointerUp={asideResize.onPointerUp}
      />
      <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-slate-100 bg-white">
        <div className="shrink-0 border-b border-slate-100 px-5 py-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{settingsHeading}</h3>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
