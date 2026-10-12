/** Compile studio blocks to email-safe HTML + plain text. No network I/O. */

export type NewsletterEmailBlock = {
  type: string;
  data?: Record<string, unknown> | null;
};

export type NewsletterEmailPayload = {
  html: string;
  text: string;
};

const FONT =
  "Georgia,'Times New Roman',serif";
const TEXT = '#0E0D0B';
const MUTED = '#555555';
const ACCENT = '#0B3D2E';
const YELLOW = '#FDC20F';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cell(inner: string, style = ''): string {
  const base =
    `font-family:${FONT};font-size:17px;line-height:26px;color:${TEXT};padding:0 0 16px 0;${style}`;
  return `<tr><td style="${base}">${inner}</td></tr>`;
}

function sanitizeRichHtml(html: string): string {
  // Allow a small set of inline tags from the paragraph editor; strip scripts/events.
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function headingHtml(data: Record<string, unknown>): string {
  const level = Math.min(3, Math.max(1, Number(data.level) || 2));
  const text = escapeHtml(String(data.text ?? '')).replace(/\r\n|\r|\n/g, '<br />');
  const size = level === 1 ? 28 : level === 2 ? 22 : 18;
  return `<h${level} style="margin:0;font-family:${FONT};font-size:${size}px;line-height:1.25;color:${TEXT};font-weight:900">${text}</h${level}>`;
}

function paragraphHtml(data: Record<string, unknown>): string {
  const raw = String(data.text ?? '').trim() || '<p></p>';
  return `<div style="margin:0">${sanitizeRichHtml(raw)}</div>`;
}

function imageHtml(data: Record<string, unknown>): string {
  const url = String(data.url ?? '').trim();
  if (!url) return '';
  const alt = escapeHtml(String(data.alt ?? ''));
  const cap = String(data.caption ?? '').trim();
  const img = `<img src="${escapeHtml(url)}" alt="${alt}" width="560" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px" />`;
  if (!cap) return img;
  return `${img}<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:${MUTED}">${escapeHtml(cap)}</p>`;
}

function buttonHtml(data: Record<string, unknown>): string {
  const label = escapeHtml(String(data.label ?? data.buttonLabel ?? 'Learn more').trim() || 'Learn more');
  const href = String(data.href ?? data.url ?? '#').trim() || '#';
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${YELLOW};color:${TEXT};font-weight:bold;padding:12px 18px;text-decoration:none;border:2px solid ${TEXT}">${label}</a>`;
}

function quoteHtml(data: Record<string, unknown>): string {
  const text = escapeHtml(String(data.text ?? data.quote ?? '').trim());
  const citation = String(data.citation ?? data.author ?? '').trim();
  if (!text) return '';
  const cite = citation
    ? `<p style="margin:8px 0 0;font-size:14px;color:${MUTED}">— ${escapeHtml(citation)}</p>`
    : '';
  return `<blockquote style="margin:0;padding:12px 16px;border-left:4px solid ${ACCENT};background:#F4EFE3">${text}${cite}</blockquote>`;
}

function dividerHtml(): string {
  return `<hr style="border:0;border-top:2px solid ${TEXT};margin:8px 0" />`;
}

function listHtml(data: Record<string, unknown>, ordered: boolean): string {
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.list)
      ? data.list
      : String(data.text ?? '')
          .split(/\n+/)
          .filter(Boolean);
  const lis = items
    .map((item) => {
      if (typeof item === 'string') return `<li style="margin:0 0 6px">${escapeHtml(item)}</li>`;
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        return `<li style="margin:0 0 6px">${escapeHtml(String(o.text ?? o.label ?? ''))}</li>`;
      }
      return '';
    })
    .join('');
  if (!lis) return '';
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} style="margin:0;padding-left:22px">${lis}</${tag}>`;
}

function calloutHtml(data: Record<string, unknown>): string {
  const title = String(data.title ?? '').trim();
  const body = String(data.body ?? data.text ?? '').trim();
  if (!title && !body) return '';
  return `<div style="padding:14px 16px;background:#F4EFE3;border:2px solid ${TEXT}"><strong style="display:block;margin:0 0 6px">${escapeHtml(title)}</strong><div>${sanitizeRichHtml(body || '')}</div></div>`;
}

function bannerHtml(data: Record<string, unknown>): string {
  const title = String(data.title ?? data.heading ?? '').trim();
  const body = String(data.body ?? data.text ?? '').trim();
  const href = String(data.href ?? data.url ?? '').trim();
  const label = String(data.label ?? data.buttonLabel ?? 'Open').trim();
  let inner = '';
  if (title) inner += `<p style="margin:0 0 8px;font-size:20px;font-weight:900">${escapeHtml(title)}</p>`;
  if (body) inner += `<p style="margin:0 0 12px">${escapeHtml(body)}</p>`;
  if (href) {
    inner += `<a href="${escapeHtml(href)}" style="color:${ACCENT};font-weight:bold">${escapeHtml(label || href)}</a>`;
  }
  return inner ? `<div style="padding:16px;background:${ACCENT};color:#fff">${inner}</div>` : '';
}

function fallbackHtml(type: string, data: Record<string, unknown>): string {
  const title =
    String(data.title ?? data.heading ?? data.label ?? data.name ?? '').trim() ||
    type.replace(/_/g, ' ');
  const url = String(data.url ?? data.href ?? data.product_url ?? '').trim();
  const subtitle = String(data.subtitle ?? data.body ?? data.text ?? data.caption ?? '').trim();
  const bits: string[] = [];
  bits.push(`<p style="margin:0;font-weight:bold">${escapeHtml(title)}</p>`);
  if (subtitle) {
    const plain = stripTags(subtitle) || subtitle;
    bits.push(`<p style="margin:6px 0 0;color:${MUTED};font-size:14px">${escapeHtml(plain.slice(0, 280))}</p>`);
  }
  if (url) {
    bits.push(
      `<p style="margin:8px 0 0"><a href="${escapeHtml(url)}" style="color:${ACCENT}">${escapeHtml(url)}</a></p>`,
    );
  } else if (type === 'youtube') {
    bits.push(`<p style="margin:6px 0 0;color:${MUTED};font-size:14px">Video — open in the browser to watch.</p>`);
  }
  return `<div style="padding:12px 14px;border:1px dashed ${MUTED}">${bits.join('')}</div>`;
}

function blockToHtml(block: NewsletterEmailBlock): string {
  const data = block.data && typeof block.data === 'object' ? block.data : {};
  switch (block.type) {
    case 'heading':
      return headingHtml(data);
    case 'paragraph':
    case 'text':
      return paragraphHtml(data);
    case 'image':
      return imageHtml(data);
    case 'button':
    case 'cta':
      return buttonHtml(data);
    case 'quote':
      return quoteHtml(data);
    case 'divider':
      return dividerHtml();
    case 'spacer':
      return `<div style="height:${Math.min(64, Math.max(8, Number(data.height) || 24))}px;line-height:${Math.min(64, Math.max(8, Number(data.height) || 24))}px;font-size:1px">&nbsp;</div>`;
    case 'list':
    case 'bullet_list':
      return listHtml(data, false);
    case 'numbered_list':
      return listHtml(data, true);
    case 'callout':
      return calloutHtml(data);
    case 'banner':
    case 'card':
      return bannerHtml(data);
    case 'gallery': {
      const images = Array.isArray(data.images) ? data.images : [];
      const parts = images
        .map((img) => {
          if (!img || typeof img !== 'object') return '';
          return imageHtml(img as Record<string, unknown>);
        })
        .filter(Boolean);
      return parts.join('<div style="height:12px"></div>');
    }
    case 'html_embed': {
      const html = String(data.html ?? '').trim();
      return html ? sanitizeRichHtml(html) : '';
    }
    case 'social_embed': {
      const caption = String(data.caption ?? data.input ?? '').trim();
      if (!caption) return '';
      return `<p style="margin:0;text-align:center;font-size:14px;color:${MUTED}">${escapeHtml(caption)}</p>`;
    }
    case 'youtube':
    case 'video':
      return fallbackHtml(block.type, data);
    case 'columns': {
      // Flatten nested column blocks for email (single column stack).
      const cols = Array.isArray(data.columns) ? data.columns : [];
      const nested: string[] = [];
      for (const col of cols) {
        const blocks =
          col && typeof col === 'object' && Array.isArray((col as { blocks?: unknown }).blocks)
            ? ((col as { blocks: NewsletterEmailBlock[] }).blocks)
            : [];
        for (const child of blocks) {
          const part = blockToHtml(child);
          if (part) nested.push(part);
        }
      }
      return nested.join('<div style="height:12px"></div>');
    }
    default:
      return fallbackHtml(block.type, data);
  }
}

function blockToText(block: NewsletterEmailBlock): string {
  const data = block.data && typeof block.data === 'object' ? block.data : {};
  switch (block.type) {
    case 'heading':
      return String(data.text ?? '').trim();
    case 'paragraph':
    case 'text':
      return stripTags(String(data.text ?? ''));
    case 'image': {
      const url = String(data.url ?? '').trim();
      const alt = String(data.alt ?? '').trim();
      const cap = String(data.caption ?? '').trim();
      return [alt || 'Image', cap, url].filter(Boolean).join('\n');
    }
    case 'button':
    case 'cta': {
      const label = String(data.label ?? data.buttonLabel ?? 'Learn more').trim();
      const href = String(data.href ?? data.url ?? '').trim();
      return href ? `${label}: ${href}` : label;
    }
    case 'quote': {
      const text = String(data.text ?? data.quote ?? '').trim();
      const citation = String(data.citation ?? data.author ?? '').trim();
      return citation ? `"${text}" — ${citation}` : `"${text}"`;
    }
    case 'divider':
      return '---';
    case 'list':
    case 'bullet_list':
    case 'numbered_list': {
      const items = Array.isArray(data.items) ? data.items : [];
      return items
        .map((item, i) => {
          const t =
            typeof item === 'string'
              ? item
              : item && typeof item === 'object'
                ? String((item as Record<string, unknown>).text ?? '')
                : '';
          return t ? `${i + 1}. ${t}` : '';
        })
        .filter(Boolean)
        .join('\n');
    }
    case 'columns': {
      const cols = Array.isArray(data.columns) ? data.columns : [];
      const parts: string[] = [];
      for (const col of cols) {
        const blocks =
          col && typeof col === 'object' && Array.isArray((col as { blocks?: unknown }).blocks)
            ? ((col as { blocks: NewsletterEmailBlock[] }).blocks)
            : [];
        for (const child of blocks) {
          const t = blockToText(child);
          if (t) parts.push(t);
        }
      }
      return parts.join('\n\n');
    }
    default: {
      const title = String(data.title ?? data.heading ?? data.label ?? block.type).trim();
      const url = String(data.url ?? data.href ?? '').trim();
      const sub = stripTags(String(data.subtitle ?? data.body ?? data.text ?? ''));
      return [title, sub, url].filter(Boolean).join('\n');
    }
  }
}

export function serializeNewsletterEmail(blocks: NewsletterEmailBlock[]): NewsletterEmailPayload {
  const rows: string[] = [];
  const textParts: string[] = [];

  for (const block of blocks || []) {
    if (!block || typeof block.type !== 'string') continue;
    const html = blockToHtml(block);
    if (html) rows.push(cell(html));
    const text = blockToText(block);
    if (text) textParts.push(text);
  }

  const html = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse"><tbody>${rows.join('') || cell('<p style="margin:0;color:#666"> </p>')}</tbody></table>`;

  return {
    html,
    text: textParts.join('\n\n').trim(),
  };
}
