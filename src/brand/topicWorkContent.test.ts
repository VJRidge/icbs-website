import { describe, expect, it } from 'vitest'
import { noteParagraphs } from './brandNote'
import { brandPages } from './pages'

describe('Building in Public topic page', () => {
  const page = brandPages.topicWork
  const byId = Object.fromEntries(page.blocks.map((block) => [block.id, block]))

  it('opens with the introduction headline and subtitle', () => {
    const hero = byId['topic-work-hero']
    expect(hero?.type).toBe('brand_hero')
    expect(hero?.data.headline).toBe('Building in public')
    expect(hero?.data.statement).toBe('The work, while it’s still becoming.')
  })

  it('keeps the three introduction paragraphs', () => {
    const intro = byId['topic-work-intro']
    expect(intro?.type).toBe('brand_note')
    expect(noteParagraphs(intro?.data ?? {})).toEqual([
      'A finished project rarely shows the decisions that shaped it.',
      'Here I document the process: what I’m building, what I’m trying, what needs another attempt, and what changes my approach.',
      'Some notes will describe progress. Others will describe a problem I haven’t solved yet. Each should leave a clearer record of the work.',
    ])
  })

  it('features the build note and the sample tutorial with their buttons', () => {
    const featured = byId['topic-work-featured']
    expect(featured?.type).toBe('brand_cards')
    expect(featured?.data.heading).toBe('Featured content')
    const items = Array.isArray(featured?.data.items) ? featured.data.items : []
    expect(items).toEqual([
      expect.objectContaining({
        title: 'From Book Page to Personal Brand',
        href: '#from-book-page',
        cta: 'Read the Build Note',
      }),
      expect.objectContaining({
        title: 'Before You Accept “Done”',
        href: '/resources/before-you-accept-done',
        cta: 'Read the Tutorial',
      }),
    ])
  })

  it('includes the full website build note', () => {
    const note = byId['topic-work-build-note']
    expect(note?.type).toBe('brand_note')
    expect(note?.data.eyebrow).toBe('Full website build note')
    expect(note?.data.heading).toBe('From Book Page to Personal Brand')
    expect(note?.data.anchor).toBe('from-book-page')
    const paragraphs = noteParagraphs(note?.data ?? {})
    expect(paragraphs[0]).toMatch(/VettaJimale\.Tech began/)
    expect(paragraphs.at(-1)).toMatch(/decide what the website needs to introduce/)
    expect(paragraphs).toHaveLength(10)
  })
})
