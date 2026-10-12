import { describe, expect, it } from 'vitest'
import { parentPathForBack, resolveSiteBackTarget } from './siteBack'

describe('parentPathForBack', () => {
  it('climbs one segment', () => {
    expect(parentPathForBack('/resources/templates/roadmap')).toBe('/resources/templates')
    expect(parentPathForBack('/resources/templates')).toBe('/resources')
    expect(parentPathForBack('/contact')).toBe('/')
    expect(parentPathForBack('/')).toBe('/')
  })
})

describe('resolveSiteBackTarget', () => {
  it('uses history for same-origin referrer', () => {
    expect(resolveSiteBackTarget('/resources', 'https://example.com/about', 'https://example.com')).toBe('history')
  })

  it('falls back to parent path without referrer', () => {
    expect(resolveSiteBackTarget('/resources/templates', '', 'https://example.com')).toBe('/resources')
  })
})
