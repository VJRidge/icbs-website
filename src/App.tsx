import Free from './pages/Free'
import FreeThanks from './pages/FreeThanks'
import Legal from './pages/Legal'
import AdminApp from './admin/AdminApp'
import HomeOrKit from './cms/HomeOrKit'
import CmsBySlug from './cms/CmsBySlug'
import ShortLinkRedirect from './cms/ShortLinkRedirect'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  const short = path.match(/^\/s\/([a-z0-9]+)$/i)
  if (short) return <ShortLinkRedirect code={short[1]} />
  if (path === '/free/thanks') return <FreeThanks />
  if (path === '/free') return <HomeOrKit slot="kit_content_id" />
  if (path === '/privacy' || path === '/terms' || path === '/refunds') {
    return <CmsBySlug slug={path.slice(1)} fallback={<Legal page={path.slice(1)} />} />
  }
  if (path === '/') return <HomeOrKit />
  return <CmsBySlug slug={path.replace(/^\//, '')} fallback={<Free />} />
}
