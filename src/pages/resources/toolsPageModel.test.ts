import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JOB_ID,
  findCategory,
  findToolLocation,
  hasActiveAffiliateLinks,
  parseJobQuery,
  visitUrlForTool,
} from './toolsPageModel'

describe('toolsPageModel', () => {
  it('defaults job query to guided builders', () => {
    expect(parseJobQuery('')).toBe(DEFAULT_JOB_ID)
    expect(parseJobQuery('?job=email')).toBe('email')
    expect(parseJobQuery('?job=nope')).toBe(DEFAULT_JOB_ID)
  })

  it('finds stack tools across categories', () => {
    expect(findToolLocation('resend')?.category.id).toBe('email')
    expect(findToolLocation('make')?.category.id).toBe('automation')
    expect(findToolLocation('claude')?.tool.name).toBe('Claude Code')
  })

  it('uses official visit URLs while affiliates are inactive', () => {
    const cursor = findToolLocation('cursor')!.tool
    expect(visitUrlForTool(cursor)).toEqual({ href: 'https://cursor.com/', sponsored: false })
    expect(hasActiveAffiliateLinks()).toBe(false)
  })

  it('returns category metadata for the picker', () => {
    const builders = findCategory('builders')
    expect(builders.label).toMatch(/Guided/i)
    expect(builders.tools.length).toBeGreaterThan(1)
  })
})
