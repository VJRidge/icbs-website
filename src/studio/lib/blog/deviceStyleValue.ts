const LENGTH = /^\d+(\.\d+)?(px|rem|em|%|vh|vw)?$/
const SIZES = new Set(['sm', 'md', 'lg'])
const WIDTH_WORDS = new Set(['auto', 'full'])

function junk(value: string): boolean {
  if (value.length > 80) return true
  return /[;{}<>\\]|url\s*\(|expression\s*\(|javascript:/i.test(value)
}

function supports(prop: string, value: string): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports(prop, value)
}

/** Empty means inherit. Anything else must be a real value for that field. */
export function deviceStyleValueOk(key: string, value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (junk(trimmed)) return false
  if (key === 'align') return trimmed === 'left' || trimmed === 'center' || trimmed === 'right' || trimmed === 'justify'
  if (key === 'size') return SIZES.has(trimmed) || LENGTH.test(trimmed)
  if (key === 'buttonWidth') return WIDTH_WORDS.has(trimmed) || LENGTH.test(trimmed) || supports('width', trimmed)
  if (key === 'fontSize') return LENGTH.test(trimmed) || supports('font-size', trimmed)
  if (key === 'marginTop' || key === 'marginBottom') {
    const prop = key === 'marginTop' ? 'margin-top' : 'margin-bottom'
    return LENGTH.test(trimmed) || supports(prop, trimmed)
  }
  if (key === 'color' || key === 'backgroundColor' || key === 'textColor') {
    const prop = key === 'backgroundColor' ? 'background-color' : 'color'
    return supports(prop, trimmed)
  }
  return false
}
