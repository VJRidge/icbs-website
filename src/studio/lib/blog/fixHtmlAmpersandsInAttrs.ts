/**
 * Bare `&` in attribute values confuses HTML parsers (expects `&amp;`). Google Fonts URLs
 * like `family=A&family=B` then break markup: the remainder can appear as raw text inside
 * the iframe (e.g. `swap" rel="stylesheet">`). `file://` is forgiving; `srcDoc`/strict parsers are not.
 */
export function escapeAmpersandsInQuotedAttrs(html: string): string {
  return html.replace(/\b([_:a-zA-Z][:\w.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g, (_match, attrName: string, qblob: string, d?: string, s?: string) => {
    const quote = qblob[0]!;
    const inner = (d ?? s ?? '').replace(
      /&(?!(?:amp|lt|gt|quot|nbsp);|#\d{1,7};|#x[0-9a-fA-F]{1,6};)/gi,
      '&amp;',
    );
    return `${attrName}=${quote}${inner}${quote}`;
  });
}
