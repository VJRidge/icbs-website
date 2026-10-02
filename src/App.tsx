import { useEffect } from 'react'
import Free from './pages/Free'
import FreeThanks from './pages/FreeThanks'
import Legal from './pages/Legal'
import Contact from './pages/Contact'
import AdminApp from './admin/AdminApp'
import HomeOrKit from './cms/HomeOrKit'
import CmsBySlug from './cms/CmsBySlug'
import ShortLinkRedirect from './cms/ShortLinkRedirect'
import BlogIndex from './cms/BlogIndex'
import BlogPost from './cms/BlogPost'
import CmsPreview from './cms/CmsPreview'
import RedirectGate from './cms/RedirectGate'

function ToLanding() {
  useEffect(() => {
    window.location.replace('/#kit')
  }, [])
  return (
    <main>
      <section className="sec green" style={{ minHeight: '40vh' }} />
    </main>
  )
}

function PublicRoutes({ path }: { path: string }) {
  const short = path.match(/^\/s\/([a-z0-9]+)$/i)
  if (short) return <ShortLinkRedirect code={short[1]} />
  if (path === '/preview') return <CmsPreview />
  if (path === '/blog') return <BlogIndex />
  const post = path.match(/^\/blog\/([^/]+)$/)
  if (post) return <BlogPost slug={decodeURIComponent(post[1])} />
  if (path === '/free/thanks') return <FreeThanks />
  if (path === '/free') return <ToLanding />
  if (path === '/contact') return <Contact />
  if (path === '/privacy' || path === '/terms' || path === '/refunds') {
    return <CmsBySlug slug={path.slice(1)} fallback={<Legal page={path.slice(1)} />} />
  }
  if (path === '/') return <HomeOrKit />
  return <CmsBySlug slug={path.replace(/^\//, '')} fallback={<Free />} />
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  return (
    <RedirectGate path={path}>
      <PublicRoutes path={path} />
    </RedirectGate>
  )
}
