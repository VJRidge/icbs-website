import { useEffect } from 'react'
import { trackPublicEvent } from './lib/analytics/trackClient'
import FreeThanks from './pages/FreeThanks'
import BuyThanks from './pages/BuyThanks'
import Legal from './pages/Legal'
import Contact from './pages/Contact'
import UpdatesSignup from './pages/UpdatesSignup'
import AdminApp from './admin/AdminApp'
import HomeOrKit from './cms/HomeOrKit'
import CmsBySlug from './cms/CmsBySlug'
import ShortLinkRedirect from './cms/ShortLinkRedirect'
import BlogIndex from './cms/BlogIndex'
import BlogPost from './cms/BlogPost'
import TopicArchive from './cms/TopicArchive'
import CmsPreview from './cms/CmsPreview'
import CustomContentByPath from './cms/CustomContentByPath'
import PublicSearch from './cms/PublicSearch'
import RedirectGate from './cms/RedirectGate'
import LocalPreviewBanner from './components/LocalPreviewBanner'
import { kitLandingTarget } from './cms/kitLandingTarget'
import BrandPage from './brand/BrandPage'
import BookPreview from './brand/BookPreview'
import DesignKit from './brand/DesignKit'
import {
  BeforeDoneFormPage,
  BookUpdatesPage,
  BuilderQuickReferencePage,
  ProjectRulesFormPage,
  RoadmapFormPage,
  TemplatesPage,
  ToolsAndUpdatesPage,
} from './pages/resources'
import LiteracyCheckPage from './literacy/LiteracyCheckPage'

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
  if (path === '/search') return <PublicSearch />
  if (path === '/blog') return <BlogIndex />
  const topic = path.match(/^\/topics\/([^/]+)$/)
  if (topic) return <TopicArchive slug={decodeURIComponent(topic[1])} />
  const post = path.match(/^\/blog\/([^/]+)$/)
  if (post) return <BlogPost slug={decodeURIComponent(post[1])} />
  const review = path.match(/^\/reviews\/([^/]+)$/)
  if (review) return <CustomContentByPath typeKey="tool_review" slug={decodeURIComponent(review[1])} />
  if (path === '/free/thanks') return <FreeThanks />
  if (path === '/buy/thanks') return <BuyThanks />
  if (path === '/free') return <ToLanding />
  if (path === '/contact') return <Contact />
  if (path === '/updates') return <UpdatesSignup />
  if (path === '/resources/builder-quick-reference') return <BuilderQuickReferencePage />
  if (path === '/resources/templates') return <TemplatesPage />
  if (path === '/resources/templates/roadmap') return <RoadmapFormPage />
  if (path === '/resources/templates/project-rules') return <ProjectRulesFormPage />
  if (path === '/resources/templates/before-you-accept-done') return <BeforeDoneFormPage />
  if (path === '/resources/tools-and-updates') return <ToolsAndUpdatesPage />
  if (path === '/resources/vibe-coding-literacy-check') return <LiteracyCheckPage />
  if (path === '/book/updates') return <BookUpdatesPage />
  if (path === '/privacy' || path === '/terms' || path === '/refunds') {
    return <CmsBySlug slug={path.slice(1)} fallback={<Legal page={path.slice(1)} />} />
  }
  if (path === '/') return <HomeOrKit />
  return <CmsBySlug slug={path.replace(/^\//, '')} />
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  useEffect(() => {
    if (path === '/admin' || path.startsWith('/admin/')) return
    trackPublicEvent('page_view', { path })
  }, [path])
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  return (
    <RedirectGate path={path}>
      <LocalPreviewBanner />
      <PublicRoutes path={path} />
    </RedirectGate>
  )
}
