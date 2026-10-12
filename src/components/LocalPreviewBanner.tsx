import './localPreviewBanner.css'

/** Yellow bar on local `npm run dev` only. Not rendered in production builds. */
export default function LocalPreviewBanner() {
  if (!import.meta.env.DEV) return null
  return (
    <p className="local-preview-banner" role="status">
      <strong>Local preview only.</strong>
      <span>This is not the live site. Nothing here is published.</span>
      <a href="/admin">Admin login</a>
      <a href="/design-kit">Design kit</a>
    </p>
  )
}
