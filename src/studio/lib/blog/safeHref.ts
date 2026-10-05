/**
 * Allowlist safe hrefs for blog CTA/button/card links.
 * Allows http(s), mailto, tel, and same-site absolute paths.
 */
export function safeHref(raw: unknown): string | undefined {
  const value = String(raw ?? '').trim();
  if (!value) return undefined;

  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  if (value.startsWith('#') && !value.includes('\\')) {
    return value;
  }

  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:') {
      return value;
    }
  } catch {
    return undefined;
  }

  return undefined;
}
