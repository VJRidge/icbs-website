/** Session drafts for fillable resource templates (survives refresh, not cross-browser). */

const PREFIX = 'icbs.template-draft.v1.'

export function formHasUserContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.some(formHasUserContent)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(formHasUserContent)
  }
  return false
}

function storageKey(id: string): string {
  return `${PREFIX}${id}`
}

export function loadFormDraft<T>(id: string): T | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(id))
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveFormDraft(id: string, value: unknown): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify(value))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearFormDraft(id: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(storageKey(id))
  } catch {
    /* ignore */
  }
}

/** Persist when the form has content; clear when emptied. */
export function syncFormDraft(id: string, value: unknown): void {
  if (formHasUserContent(value)) saveFormDraft(id, value)
  else clearFormDraft(id)
}
