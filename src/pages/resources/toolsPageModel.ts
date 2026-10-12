import toolsContent from './tools-content.json'

export type ExperienceStatus =
  | 'used-by-vj'
  | 'previously-used'
  | 'previously-explored'
  | 'researched-option'

export type ToolRecord = {
  id: string
  name: string
  experienceStatus: ExperienceStatus
  summary: string
  bestFit: string
  features: string[]
  pros: string[]
  cons: string[]
  firstTask: string
  officialUrl: string
  docsUrl: string
  pricingUrl: string | null
  costNote: string
  affiliateUrl: string | null
  isAffiliate: boolean
  reviewedAt: string
  sources: string[]
  comparisonRole?: string
}

export type ToolCategory = {
  id: string
  label: string
  title: string
  intro: string
  decision: string
  note: string
  tools: ToolRecord[]
}

export type ToolsPageContent = {
  reviewedAt: string
  categories: ToolCategory[]
  updates: { date: string; title: string; body: string; source: string }[]
}

export const TOOLS_PAGE_CONTENT = toolsContent as ToolsPageContent

export const DEFAULT_JOB_ID = 'builders'

export const WORKING_STACK: { toolId: string; blurb: string }[] = [
  { toolId: 'cursor', blurb: 'Edit and inspect' },
  { toolId: 'claude', blurb: 'Work through coding tasks' },
  { toolId: 'supabase', blurb: 'Store data and manage access' },
  { toolId: 'git', blurb: 'Record changes' },
  { toolId: 'resend', blurb: 'Deliver email' },
  { toolId: 'make', blurb: 'Automate posts' },
  { toolId: 'chatgpt', blurb: 'Think and draft' },
  { toolId: 'claude-chat', blurb: 'Work through ideas' },
]

export const EXPERIENCE_LABELS: Record<ExperienceStatus, string> = {
  'used-by-vj': 'Used by VJ',
  'previously-used': 'Previously used',
  'previously-explored': 'Previously explored',
  'researched-option': 'Researched option',
}

export function findCategory(jobId: string | null | undefined): ToolCategory {
  return (
    TOOLS_PAGE_CONTENT.categories.find((c) => c.id === jobId) ??
    TOOLS_PAGE_CONTENT.categories.find((c) => c.id === DEFAULT_JOB_ID) ??
    TOOLS_PAGE_CONTENT.categories[0]
  )
}

export function findToolLocation(toolId: string): { category: ToolCategory; tool: ToolRecord } | null {
  for (const category of TOOLS_PAGE_CONTENT.categories) {
    const tool = category.tools.find((t) => t.id === toolId)
    if (tool) return { category, tool }
  }
  return null
}

export function parseJobQuery(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const job = params.get('job')
  return findCategory(job).id
}

export function jobQueryHref(jobId: string): string {
  return `/resources/tools-and-updates?job=${encodeURIComponent(jobId)}`
}

/** Official visit URL; affiliate only when approved and present. */
export function visitUrlForTool(tool: ToolRecord): { href: string; sponsored: boolean } {
  if (tool.isAffiliate && tool.affiliateUrl && /^https?:\/\//i.test(tool.affiliateUrl)) {
    return { href: tool.affiliateUrl, sponsored: true }
  }
  return { href: tool.officialUrl, sponsored: false }
}

export function formatReviewedLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function hasActiveAffiliateLinks(content: ToolsPageContent = TOOLS_PAGE_CONTENT): boolean {
  return content.categories.some((c) =>
    c.tools.some((t) => t.isAffiliate && !!t.affiliateUrl && /^https?:\/\//i.test(t.affiliateUrl)),
  )
}
