import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseBrowser } from './supabaseBrowser'

export type SiteMenuItem = { id: string; label: string; href: string }

export const SOCIAL_NETWORKS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const

export type SocialId = (typeof SOCIAL_NETWORKS)[number]['id']
export type SiteSocial = Record<SocialId, string>

export const EMPTY_SOCIAL: SiteSocial = {
  instagram: '',
  x: '',
  tiktok: '',
  facebook: '',
  linkedin: '',
}

export type SiteChrome = {
  siteName: string
  tagline: string
  logoUrl: string
  footerCredit: string
  social: SiteSocial
  header: SiteMenuItem[]
  footer: SiteMenuItem[]
}

export const DEFAULT_SITE_CHROME: SiteChrome = {
  siteName: 'I Call BS',
  tagline: 'Practical. Honest. Receipts-driven.',
  logoUrl: '',
  footerCredit: '© 2026 V. Jimale Ridgeway',
  social: { ...EMPTY_SOCIAL },
  header: [
    { id: 'book', label: 'The book', href: '/' },
    { id: 'kit', label: 'Free Starter Kit', href: '/#kit' },
    { id: 'blog', label: 'Blog', href: '/blog' },
    { id: 'about', label: 'About', href: '/about' },
  ],
  footer: [
    { id: 'blog', label: 'Blog', href: '/blog' },
    { id: 'about', label: 'About', href: '/about' },
    { id: 'privacy', label: 'Privacy', href: '/privacy' },
    { id: 'terms', label: 'Terms', href: '/terms' },
    { id: 'refunds', label: 'Refunds', href: '/refunds' },
  ],
}

export function parseMenuItems(raw: unknown): SiteMenuItem[] | null {
  if (!Array.isArray(raw)) return null
  return raw
    .map((row, i) => {
      const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const label = String(o.label ?? '').trim()
      const href = String(o.href ?? '').trim()
      if (!label || !href) return null
      return { id: String(o.id ?? `item-${i}`), label, href }
    })
    .filter((x): x is SiteMenuItem => !!x)
}

function readSocial(raw: unknown): SiteSocial {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const social = { ...EMPTY_SOCIAL }
  for (const n of SOCIAL_NETWORKS) social[n.id] = String(o[n.id] ?? '').trim()
  return social
}

function readChromeStyles(raw: unknown): Pick<SiteChrome, 'tagline' | 'logoUrl' | 'footerCredit' | 'social'> {
  const styles = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const chrome = styles.chrome && typeof styles.chrome === 'object' ? (styles.chrome as Record<string, unknown>) : {}
  return {
    tagline: String(chrome.tagline ?? DEFAULT_SITE_CHROME.tagline),
    logoUrl: String(chrome.logoUrl ?? ''),
    footerCredit: String(chrome.footerCredit ?? DEFAULT_SITE_CHROME.footerCredit),
    social: readSocial(chrome.social),
  }
}

export function chromeStylesPayload(chrome: Pick<SiteChrome, 'tagline' | 'logoUrl' | 'footerCredit' | 'social'>, prev: unknown) {
  const styles = prev && typeof prev === 'object' ? { ...(prev as Record<string, unknown>) } : {}
  const prevChrome =
    styles.chrome && typeof styles.chrome === 'object' ? { ...(styles.chrome as Record<string, unknown>) } : {}
  styles.chrome = {
    ...prevChrome,
    tagline: chrome.tagline,
    logoUrl: chrome.logoUrl,
    footerCredit: chrome.footerCredit,
    social: chrome.social,
  }
  return styles
}

export async function loadSiteChrome(sb: SupabaseClient | null = supabaseBrowser()): Promise<SiteChrome> {
  if (!sb) return DEFAULT_SITE_CHROME
  const [{ data: settings }, { data: menus }] = await Promise.all([
    sb.from('settings').select('site_name, global_styles').eq('id', 1).maybeSingle(),
    sb.from('menus').select('location, items').in('location', ['header', 'footer']),
  ])
  const extra = readChromeStyles(settings?.global_styles)
  const headerRow = menus?.find((m) => m.location === 'header')
  const footerRow = menus?.find((m) => m.location === 'footer')
  return {
    siteName: (settings?.site_name || DEFAULT_SITE_CHROME.siteName).trim() || DEFAULT_SITE_CHROME.siteName,
    ...extra,
    header: parseMenuItems(headerRow?.items) ?? DEFAULT_SITE_CHROME.header,
    footer: parseMenuItems(footerRow?.items) ?? DEFAULT_SITE_CHROME.footer,
  }
}

let cached: Promise<SiteChrome> | null = null

export function invalidateSiteChrome() {
  cached = null
}

export function loadSiteChromeOnce(): Promise<SiteChrome> {
  if (!cached) cached = loadSiteChrome()
  return cached
}
