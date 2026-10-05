import { useEffect } from 'react'
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
import { kitLandingTarget } from './cms/kitLandingTarget'
import BrandPage from './brand/BrandPage'
import BookPreview from './brand/BookPreview'
import DesignKit from './brand/DesignKit'

function ToFreeKit({ thanks = false }: { thanks?: boolean }) {
  useEffect(() => {
    window.location.replace(thanks ? '/free-kit/thank-you' : '/free-kit')
  }, [thanks])
  return (
    <main>
      <section className="sec green" style={{ minHeight: '40vh' }} />
    </main>
  )
}

function ToLanding() {
  useEffect(() => {
    let gone = false
    void kitLandingTarget().then((target) => {
      if (!gone) window.location.replace(target)
    })
    return () => {
      gone = true
    }
  }, [])
  return (
    <main>
      <section className="sec green" style={{ minHeight: '40vh' }} />
    </main>
  )
}

function PublicRoutes({ path }: { path: string }) {
  if (import.meta.env.DEV) {
    if (path === '/') return <BrandPage id="home" />
    if (path === '/resources') return <BrandPage id="resources" />
    if (path === '/resources/ai-and-technology') return <BrandPage id="topicAi" />
    if (path === '/resources/creative-tools') return <BrandPage id="topicCreative" />
    if (path === '/resources/building-in-public') return <BrandPage id="topicWork" />
    if (path === '/resources/before-you-accept-done') return <BrandPage id="sample" />
    if (path === '/products') return <BrandPage id="products" />
    if (path === '/products/i-call-bs') return <BookPreview />
    if (path === '/free-kit') return <BrandPage id="kit" />
    if (path === '/free-kit/thank-you') return <BrandPage id="thanks" />
    if (path === '/about') return <BrandPage id="about" />
    if (path === '/design-kit') return <DesignKit />
    if (path === '/contact') return <BrandPage id="contact" />
    if (path === '/free') return <ToFreeKit />
    if (path === '/free/thanks') return <ToFreeKit thanks />
  }
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
  return <CmsBySlug slug={path.replace(/^\//, '')} />
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
