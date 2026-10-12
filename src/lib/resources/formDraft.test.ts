import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearFormDraft,
  formHasUserContent,
  loadFormDraft,
  saveFormDraft,
} from './formDraft'

function mockSessionStorage() {
  const map = new Map<string, string>()
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    clear: () => {
      map.clear()
    },
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
  }
  vi.stubGlobal('sessionStorage', storage)
}

describe('formHasUserContent', () => {
  it('returns false for empty strings and unchecked trees', () => {
    expect(formHasUserContent({ a: '', b: '  ', checks: { x: false } })).toBe(false)
  })

  it('returns true when any string is filled or a check is on', () => {
    expect(formHasUserContent({ a: 'Roadmap', b: '' })).toBe(true)
    expect(formHasUserContent({ a: '', checks: { x: true } })).toBe(true)
  })
})

describe('form draft storage', () => {
  beforeEach(() => {
    mockSessionStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips JSON drafts and clears empty keys', () => {
    saveFormDraft('roadmap', { project: 'Demo' })
    expect(loadFormDraft<{ project: string }>('roadmap')).toEqual({ project: 'Demo' })
    clearFormDraft('roadmap')
    expect(loadFormDraft('roadmap')).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    sessionStorage.setItem('icbs.template-draft.v1.roadmap', '{not-json')
    expect(loadFormDraft('roadmap')).toBeNull()
  })
})
