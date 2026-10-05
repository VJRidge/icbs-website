import { supabaseBrowser } from '../lib/supabaseBrowser'

function hasKitAnchor(value: unknown, depth = 0): boolean {
  if (depth > 8 || value == null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasKitAnchor(item, depth + 1))
  const rec = value as Record<string, unknown>
  if (rec.anchor === 'kit') return true
  return Object.values(rec).some((item) => hasKitAnchor(item, depth + 1))
}

/** Where `/free` should land. Uses `/#kit` only when the homepage actually has that section. */
export async function kitLandingTarget(): Promise<'/' | '/#kit'> {
  try {
    const sb = supabaseBrowser()
    if (!sb) return '/'
    const { data: settings } = await sb.from('settings').select('homepage_content_id').eq('id', 1).maybeSingle()
    const id = settings?.homepage_content_id
    if (!id) return '/'
    const { data: page } = await sb
      .from('contents')
      .select('published_document, status')
      .eq('id', id)
      .maybeSingle()
    if (page?.status === 'published' && hasKitAnchor(page.published_document)) return '/#kit'
    return '/'
  } catch {
    return '/'
  }
}
