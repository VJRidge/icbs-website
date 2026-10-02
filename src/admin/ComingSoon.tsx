import { ADMIN_NAV } from './nav'

export default function ComingSoon({ path }: { path: string }) {
  const item = ADMIN_NAV.find((n) => n.href === path)
  return (
    <div className="ad-panel">
      <h2>{item?.label ?? 'Section'}</h2>
      <p className="ad-empty">
        This screen is sketched in the plan as Phase {item?.phase ?? '—'}. The editor, media
        library, and builder are not wired yet so the live kit site stays stable.
      </p>
    </div>
  )
}
