import type { BlogBlock } from './blogBlockTypes';
import {
  parseSocialEmbedInput,
  sanitizeSocialEmbedBlockquote,
  socialEmbedIframeHeight,
} from './socialEmbed';
import {
  boxShadowFromPreset,
  buildBlogImageFilterCss,
  hoverInnerClass,
  overlayPlacementHtmlClass,
  overlayTitleHtmlClass,
} from './blogImagePresentation';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractYoutubeId(raw: string): string {
  const m = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([^&?/\s]+)/);
  return (m?.[1] || raw || '').trim();
}

function storyMetricsBgAttr(cssColor: string): string {
  const raw = cssColor.trim();
  if (!raw) return '';
  return ` style="background-color:${escapeHtml(raw)}"`;
}

function serializeStoryMetricsBlock(data: Record<string, unknown>): string {
  const layoutRaw = String(data.layout ?? 'full');
  const layout =
    layoutRaw === 'spotlight' || layoutRaw === 'stats' || layoutRaw === 'actions' ? layoutRaw : 'full';
  const spotY = escapeHtml(String(data.spotlightYear ?? ''));
  const lead = escapeHtml(String(data.spotlightLead ?? ''));
  const body = escapeHtml(String(data.spotlightBody ?? ''));
  const actionsTitleEsc = escapeHtml(String(data.actionsTitle ?? ''));
  const stats = Array.isArray(data.stats) ? data.stats : [];
  let statsHtml = '';
  for (const row of stats) {
    const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
    const val = escapeHtml(String(o.value ?? ''));
    const lab = escapeHtml(String(o.label ?? ''));
    const cap = escapeHtml(String(o.caption ?? ''));
    const ac = escapeHtml(['sky', 'gold', 'slate'].includes(String(o.accent)) ? String(o.accent) : 'sky');
    statsHtml += `<div class="blog-metrics-stat" data-accent="${ac}"><div class="blog-metrics-val">${val}</div><p class="blog-metrics-label">${lab}</p><p class="blog-metrics-cap">${cap}</p></div>`;
  }
  const actArr = Array.isArray(data.actions) ? data.actions : [];
  const lis = actArr.map((line) => `<li>${escapeHtml(String(line ?? ''))}</li>`).join('');
  const shellAttr = storyMetricsBgAttr(String(data.shellBg ?? ''));
  const insetAttr = storyMetricsBgAttr(String(data.insetBg ?? ''));

  const spotInner =
    spotY || lead || body
      ? `<div class="blog-metrics-spot"><span>${spotY}</span><p><strong>${lead}</strong> ${body}</p></div>`
      : '';
  const statsInner = `<div class="blog-metrics-stats">${statsHtml}</div>`;
  const actionsInner = lis
    ? `<aside class="blog-metrics-actions"${insetAttr}><h4>${actionsTitleEsc}</h4><ul>${lis}</ul></aside>`
    : '';

  let inner = '';
  if (layout === 'full') inner = spotInner + statsInner + actionsInner;
  else if (layout === 'spotlight') inner = spotInner;
  else if (layout === 'stats') inner = statsInner;
  else inner = actionsInner;

  return `<section class="blog-block-story-metrics-static" data-layout="${escapeHtml(layout)}"${shellAttr}>${inner}</section>`;
}

/** Flat HTML snapshot for `publisher_blog_posts.body` (SEO, legacy readers, HTML mode). */
export function serializeBlogBlocksToHtml(blocks: BlogBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const d = block.data;
    switch (block.type) {
      case 'paragraph': {
        const html = String(d.text ?? '');
        parts.push(html || '<p></p>');
        break;
      }
      case 'heading': {
        const level = Math.min(6, Math.max(1, Number(d.level) || 2));
        const text = escapeHtml(String(d.text ?? '')).replace(/\r\n|\r|\n/g, '<br />');
        parts.push(`<h${level}>${text}</h${level}>`);
        break;
      }
      case 'image': {
        const url = String(d.url ?? '').trim();
        if (!url) break;
        const alt = escapeHtml(String(d.alt ?? ''));
        const cap = String(d.caption ?? '').trim();
        const scale = Math.min(100, Math.max(25, Number(d.scale) || 100));
        const b = Number(d.brightness) || 100;
        const c = Number(d.contrast) || 100;
        const s = Number(d.saturation) || 100;
        const cropX = Number(d.cropX) || 0;
        const cropY = Number(d.cropY) || 0;
        const cropW = Number(d.cropW) || 100;
        const cropH = Number(d.cropH) || 100;
        const borderRadiusPx = Math.min(64, Math.max(0, Number(d.borderRadiusPx) || 12));
        const borderWidthPx = Math.min(12, Math.max(0, Number(d.borderWidthPx) || 0));
        const borderColor = String(d.borderColor ?? '#e2e8f0');
        const shadowPreset = String(d.shadowPreset ?? 'md');
        const overlayColor = String(d.overlayColor ?? '#000000');
        const overlayOpacity = Math.min(95, Math.max(0, Number(d.overlayOpacity) || 0));
        const overlayBlendMode = String(d.overlayBlendMode ?? 'normal');
        const filterPreset = String(d.filterPreset ?? 'none');
        const extraBlurPx = Math.min(8, Math.max(0, Number(d.extraBlurPx) || 0));
        const extraGrayscale = Math.min(100, Math.max(0, Number(d.extraGrayscale) || 0));
        const hueRotateDeg = Math.max(-180, Math.min(180, Number(d.hueRotateDeg) || 0));
        const overlayTitle = String(d.overlayTitle ?? '').trim();
        const overlaySubtitle = String(d.overlaySubtitle ?? '').trim();
        const overlayPlacement = String(d.overlayPlacement ?? 'center');
        const overlayTextColor = String(d.overlayTextColor ?? '#ffffff');
        const overlayTextShadow = d.overlayTextShadow !== false;
        const overlayTitleSize = String(d.overlayTitleSize ?? 'lg');
        const hoverEffect = String(d.hoverEffect ?? 'none');
        const filterCss = buildBlogImageFilterCss({
          brightness: b,
          contrast: c,
          saturation: s,
          filterPreset,
          extraBlurPx,
          extraGrayscale,
          hueRotateDeg,
        });
        const style = escapeHtml(
          `width:${scale}%;max-width:100%;filter:${filterCss};clip-path:inset(${cropY}% ${100 - cropX - cropW}% ${100 - cropY - cropH}% ${cropX}%);border-radius:${borderRadiusPx}px;box-shadow:${boxShadowFromPreset(shadowPreset)};border:${borderWidthPx}px solid ${borderColor}`,
        );
        const overlayHtml =
          overlayOpacity > 0
            ? `<span class="blog-block-img-overlay" style="background-color:${escapeHtml(
                overlayColor,
              )};opacity:${overlayOpacity / 100};mix-blend-mode:${escapeHtml(overlayBlendMode)};border-radius:${borderRadiusPx}px"></span>`
            : '';
        const overlayTextHtml =
          overlayTitle || overlaySubtitle
            ? `<span class="${overlayPlacementHtmlClass(overlayPlacement)}" style="color:${escapeHtml(
                overlayTextColor,
              )};text-shadow:${overlayTextShadow ? '0 2px 8px rgba(0,0,0,0.45)' : 'none'}">${
                overlayTitle ? `<strong class="${overlayTitleHtmlClass(overlayTitleSize)}">${escapeHtml(overlayTitle)}</strong>` : ''
              }${overlaySubtitle ? `<em>${escapeHtml(overlaySubtitle)}</em>` : ''}</span>`
            : '';
        parts.push(
          `<figure class="blog-block-img"><span class="blog-block-img-shell ${hoverInnerClass(hoverEffect)}"><img src="${escapeHtml(url)}" alt="${alt}" style="${style}" />${overlayHtml}${overlayTextHtml}</span>${
            cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''
          }</figure>`,
        );
        break;
      }
      case 'video': {
        const url = String(d.url ?? '').trim();
        if (!url) break;
        const cap = String(d.caption ?? '').trim();
        const uEsc = escapeHtml(url);
        const isDirect =
          /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url) &&
          !/youtube\.com|youtu\.be|vimeo\.com/i.test(url);
        if (isDirect) {
          parts.push(
            `<figure class="blog-block-video-file"><video src="${uEsc}" controls playsinline preload="metadata" class="w-full max-h-[80vh] rounded-xl bg-black"></video>${
              cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''
            }</figure>`,
          );
        } else {
          const embed = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([^&?/\s]+)/);
          const src = embed?.[1]
            ? `https://www.youtube-nocookie.com/embed/${escapeHtml(embed[1])}`
            : escapeHtml(url);
          parts.push(
            `<figure class="blog-block-video"><div class="aspect-video"><iframe src="${src}" title="Video" loading="lazy" allowfullscreen></iframe></div>${
              cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''
            }</figure>`,
          );
        }
        break;
      }
      case 'quote': {
        const text = escapeHtml(String(d.text ?? ''));
        const attr = String(d.attribution ?? '').trim();
        parts.push(
          `<blockquote class="blog-block-quote"><p>${text}</p>${
            attr ? `<footer>— ${escapeHtml(attr)}</footer>` : ''
          }</blockquote>`,
        );
        break;
      }
      case 'callout': {
        const text = escapeHtml(String(d.text ?? ''));
        const icon = escapeHtml(String(d.icon ?? '💡'));
        parts.push(`<aside class="blog-block-callout" data-variant="${escapeHtml(String(d.variant ?? 'info'))}"><span>${icon}</span><p>${text}</p></aside>`);
        break;
      }
      case 'divider': {
        const color = String(d.color ?? '#E8B800');
        parts.push(`<hr class="blog-block-divider" style="border-color:${escapeHtml(color)}" />`);
        break;
      }
      case 'spacer': {
        const h = Number(d.height) || 48;
        parts.push(`<div class="blog-block-spacer" style="height:${h}px" aria-hidden="true"></div>`);
        break;
      }
      case 'youtube': {
        const id = extractYoutubeId(String(d.videoId ?? ''));
        if (!id) break;
        const start = Number(d.start) || 0;
        const embed = `https://www.youtube-nocookie.com/embed/${id}?start=${start}`;
        const cap = String(d.caption ?? '').trim();
        parts.push(
          `<figure class="blog-block-youtube"><div class="aspect-video"><iframe src="${embed}" title="YouTube" allowfullscreen loading="lazy"></iframe></div>${
            cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''
          }</figure>`,
        );
        break;
      }
      case 'social_embed': {
        const input = String(d.input ?? '').trim();
        if (!input) break;
        const parsed = parseSocialEmbedInput(input);
        const cap = String(d.caption ?? '').trim();
        const capHtml = cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : '';
        if (parsed.iframeSrc) {
          const h = socialEmbedIframeHeight(parsed.platform);
          parts.push(
            `<figure class="blog-block-social-embed"><div class="blog-social-frame" style="min-height:${h}px"><iframe src="${escapeHtml(parsed.iframeSrc)}" title="Social embed" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>${capHtml}</figure>`,
          );
        } else if (parsed.blockquoteHtml) {
          parts.push(
            `<figure class="blog-block-social-embed blog-block-social-embed-blockquote">${sanitizeSocialEmbedBlockquote(parsed.blockquoteHtml)}${capHtml}</figure>`,
          );
        }
        break;
      }
      case 'galaxy': {
        const text = escapeHtml(String(d.text ?? ''));
        const sub = escapeHtml(String(d.subtext ?? ''));
        parts.push(
          `<section class="blog-block-galaxy-placeholder" style="min-height:${Number(d.height) || 400}px"><div><h2>${text}</h2>${
            sub ? `<p>${sub}</p>` : ''
          }</div></section>`,
        );
        break;
      }
      case 'code': {
        const code = escapeHtml(String(d.code ?? ''));
        const lang = escapeHtml(String(d.language ?? ''));
        parts.push(`<pre class="blog-block-code"><code class="language-${lang}">${code}</code></pre>`);
        break;
      }
      case 'tabs': {
        const tabs = Array.isArray(d.tabs) ? d.tabs : [];
        const stacked = tabs
          .map((t: unknown) => {
            const o = t && typeof t === 'object' ? (t as Record<string, unknown>) : {};
            const label = escapeHtml(String(o.label ?? ''));
            const html = typeof o.html === 'string' ? o.html : '';
            return `<div class="blog-tab-static"><h3 class="blog-tab-title">${label}</h3><div class="blog-tab-body">${html}</div></div>`;
          })
          .join('');
        parts.push(`<section class="blog-block-tabs-static">${stacked}</section>`);
        break;
      }
      case 'columns': {
        const layout = String(d.layout ?? '50-50');
        const cols = Array.isArray(d.columns) ? d.columns : [];
        const widthsRaw = Array.isArray(d.columnWidths) ? d.columnWidths.join(',') : '';
        let inner = '';
        for (const col of cols) {
          const o = col && typeof col === 'object' ? (col as Record<string, unknown>) : {};
          const nested = Array.isArray(o.blocks) ? (o.blocks as BlogBlock[]) : [];
          inner += `<div class="blog-columns-col">${serializeBlogBlocksToHtml(nested)}</div>`;
        }
        parts.push(
          `<section class="blog-block-columns-static" data-layout="${escapeHtml(layout)}"${
            widthsRaw ? ` data-column-widths="${escapeHtml(widthsRaw)}"` : ''
          }>${inner}</section>`,
        );
        break;
      }
      case 'accordion': {
        const items = Array.isArray(d.items) ? d.items : [];
        const inner = items
          .map((row: unknown) => {
            const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
            const title = escapeHtml(String(o.title ?? ''));
            const html = typeof o.html === 'string' ? o.html : '';
            const open = Boolean(o.open);
            return `<details class="blog-acc-item"${open ? ' open' : ''}><summary>${title}</summary><div class="blog-acc-body">${html}</div></details>`;
          })
          .join('');
        parts.push(`<section class="blog-block-accordion-static">${inner}</section>`);
        break;
      }
      case 'slideshow': {
        const slides = Array.isArray(d.slides) ? d.slides : [];
        const figs = slides
          .filter((s: unknown) => {
            const o = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
            return String(o.url ?? '').trim();
          })
          .map((s: unknown) => {
            const o = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
            const url = escapeHtml(String(o.url ?? '').trim());
            const alt = escapeHtml(String(o.alt ?? ''));
            const cap = String(o.caption ?? '').trim();
            const credit = String(o.credit ?? '').trim();
            return `<figure class="blog-block-slideshow-slide"><img src="${url}" alt="${alt}" loading="lazy" />${
              cap || credit
                ? `<figcaption>${escapeHtml(cap)}${credit ? `<cite>${escapeHtml(credit)}</cite>` : ''}</figcaption>`
                : ''
            }</figure>`;
          })
          .join('');
        parts.push(`<section class="blog-block-slideshow-static">${figs}</section>`);
        break;
      }
      case 'gallery': {
        const imgs = Array.isArray(d.images) ? d.images : [];
        const cells = imgs
          .filter((row: unknown) => {
            const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
            return String(o.url ?? '').trim();
          })
          .map((row: unknown) => {
            const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
            const url = escapeHtml(String(o.url ?? '').trim());
            const alt = escapeHtml(String(o.alt ?? ''));
            const fx = Number(o.focalX);
            const fy = Number(o.focalY);
            const pos =
              Number.isFinite(fx) && Number.isFinite(fy) ? ` style="object-position:${fx}% ${fy}%"` : '';
            const cap = String(o.caption ?? '').trim();
            const credit = String(o.credit ?? '').trim();
            return `<figure class="blog-block-gallery-cell"><img src="${url}" alt="${alt}" loading="lazy"${pos} />${
              cap || credit
                ? `<figcaption>${escapeHtml(cap)}${credit ? `<cite>${escapeHtml(credit)}</cite>` : ''}</figcaption>`
                : ''
            }</figure>`;
          })
          .join('');
        parts.push(`<section class="blog-block-gallery-static">${cells}</section>`);
        break;
      }
      case 'timeline': {
        const variant = String(d.variant ?? 'story_dark') === 'minimal' ? 'minimal' : 'story_dark';
        const sectionLabel = escapeHtml(String(d.sectionLabel ?? 'THE TIMELINE').trim() || 'THE TIMELINE');
        const qt = escapeHtml(String(d.quoteText ?? ''));
        const qa = escapeHtml(String(d.quoteAttribution ?? '').trim());
        const itemsRaw = Array.isArray(d.items) ? d.items : [];
        let inner = '';
        for (const row of itemsRaw) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const y = escapeHtml(String(o.year ?? ''));
          const t = escapeHtml(String(o.title ?? ''));
          const b = escapeHtml(String(o.body ?? ''));
          inner += `<li><span class="blog-timeline-y">${y}</span><strong class="blog-timeline-t">${t}</strong><p class="blog-timeline-b">${b}</p></li>`;
        }
        parts.push(
          `<section class="blog-block-timeline-static" data-variant="${escapeHtml(variant)}">` +
            (variant === 'story_dark' && qt
              ? `<header class="blog-timeline-quote"><blockquote><p>${qt}</p>` +
                  (qa ? `<footer>${qa}</footer>` : '') +
                `</blockquote></header>`
              : '') +
            `<h3 class="blog-timeline-heading">${sectionLabel}</h3><ol>${inner}</ol></section>`,
        );
        break;
      }
      case 'story_metrics': {
        parts.push(serializeStoryMetricsBlock(d));
        break;
      }
      case 'button': {
        const text = escapeHtml(String(d.text ?? 'Click here'));
        const url = String(d.url ?? '#').trim();
        let href: string;
        if (!url || url === '#') href = '#';
        else if (url.startsWith('/') || url.startsWith('#')) href = escapeHtml(url);
        else if (/^https?:\/\//i.test(url)) href = escapeHtml(url);
        else href = `https://${escapeHtml(url)}`;
        const style = ['primary', 'secondary', 'ghost'].includes(String(d.style)) ? String(d.style) : 'primary';
        const align = ['left', 'center', 'right'].includes(String(d.align)) ? String(d.align) : 'left';
        const size = ['sm', 'md', 'lg'].includes(String(d.size)) ? String(d.size) : 'md';
        parts.push(
          `<p class="blog-block-button-wrap" style="text-align:${escapeHtml(align)}"><a href="${href}" class="blog-btn blog-btn-${escapeHtml(style)} blog-btn-${escapeHtml(size)}">${text}</a></p>`,
        );
        break;
      }
      case 'banner': {
        const text = escapeHtml(String(d.text ?? ''));
        const sub = escapeHtml(String(d.subtext ?? ''));
        const bg = escapeHtml(String(d.bgColor ?? '#072a1b'));
        const fg = escapeHtml(String(d.textColor ?? '#FFFFFF'));
        const align = ['left', 'center', 'right'].includes(String(d.align)) ? String(d.align) : 'center';
        parts.push(
          `<section class="blog-block-banner" style="background-color:${bg};color:${fg};text-align:${escapeHtml(align)}"><div class="blog-banner-inner"><h2 class="blog-banner-title">${text}</h2>${
            sub ? `<p class="blog-banner-sub">${sub}</p>` : ''
          }</div></section>`,
        );
        break;
      }
      case 'card': {
        const title = escapeHtml(String(d.title ?? ''));
        const body = escapeHtml(String(d.body ?? ''));
        const img = String(d.image ?? '').trim();
        const link = String(d.link ?? '').trim();
        const linkText = escapeHtml(String(d.linkText ?? 'Learn more'));
        const imgHtml = img
          ? `<img class="blog-card-img" src="${escapeHtml(img)}" alt="" loading="lazy" />`
          : '';
        const cta =
          link && (/^https?:\/\//i.test(link) || link.startsWith('/'))
            ? `<a class="blog-card-link" href="${escapeHtml(link)}">${linkText}</a>`
            : '';
        parts.push(
          `<article class="blog-block-card">${imgHtml}<div class="blog-card-body"><h3 class="blog-card-title">${title}</h3><p class="blog-card-text">${body}</p>${cta}</div></article>`,
        );
        break;
      }
      case 'countdown': {
        const target = escapeHtml(String(d.targetDate ?? '').trim());
        const title = escapeHtml(String(d.title ?? ''));
        parts.push(
          `<section class="blog-block-countdown"${target ? ` data-target="${target}"` : ''}><h3 class="blog-countdown-title">${title}</h3><p class="blog-countdown-target"><time datetime="${target}">${target || 'Set a target date'}</time></p></section>`,
        );
        break;
      }
      case 'stats': {
        const cols = Math.min(6, Math.max(1, Number(d.columns) || 3));
        const items = Array.isArray(d.items) ? d.items : [];
        let inner = '';
        for (const row of items) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const val = escapeHtml(String(o.value ?? ''));
          const lab = escapeHtml(String(o.label ?? ''));
          const icon = escapeHtml(String(o.icon ?? ''));
          inner += `<div class="blog-stat-cell"><span class="blog-stat-icon">${icon}</span><div class="blog-stat-value">${val}</div><div class="blog-stat-label">${lab}</div></div>`;
        }
        parts.push(`<section class="blog-block-stats" style="--blog-stat-cols:${cols}">${inner}</section>`);
        break;
      }
      case 'team': {
        const cols = Math.min(4, Math.max(1, Number(d.columns) || 3));
        const layout = String(d.layout ?? 'grid') === 'scroll' ? 'scroll' : 'grid';
        const members = Array.isArray(d.members) ? d.members : [];
        let inner = '';
        for (const row of members) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const name = escapeHtml(String(o.name ?? ''));
          const role = escapeHtml(String(o.role ?? ''));
          const bio = escapeHtml(String(o.bio ?? ''));
          const image = String(o.image ?? '').trim();
          const imgHtml = image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" class="blog-team-img" />` : '';
          inner += `<div class="blog-team-member">${imgHtml}<h4 class="blog-team-name">${name}</h4><p class="blog-team-role">${role}</p><p class="blog-team-bio">${bio}</p></div>`;
        }
        parts.push(`<section class="blog-block-team" data-layout="${escapeHtml(layout)}" style="--blog-team-cols:${cols}">${inner}</section>`);
        break;
      }
      case 'table': {
        const rows = Array.isArray(d.rows) ? d.rows : [];
        const hasHeader = Boolean(d.hasHeader);
        let html = '<table class="blog-block-table"><tbody>';
        rows.forEach((row: unknown, ri: number) => {
          const cells = Array.isArray(row) ? row.map((c) => escapeHtml(String(c ?? ''))) : [];
          const tag = hasHeader && ri === 0 ? 'th' : 'td';
          html += `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
        });
        html += '</tbody></table>';
        parts.push(html);
        break;
      }
      case 'map_embed': {
        const src = String(d.src ?? '').trim();
        const h = Math.min(1200, Math.max(200, Number(d.height) || 400));
        if (!src) break;
        const esc = escapeHtml(src);
        parts.push(
          `<figure class="blog-block-map"><div class="blog-map-frame" style="height:${h}px"><iframe src="${esc}" title="Map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div></figure>`,
        );
        break;
      }
      case 'testimonial': {
        const quote = escapeHtml(String(d.quote ?? ''));
        const name = escapeHtml(String(d.name ?? ''));
        const role = escapeHtml(String(d.role ?? ''));
        const imageUrl = String(d.imageUrl ?? '').trim();
        const rating = Math.min(5, Math.max(0, Number(d.rating) || 0));
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const img = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" class="blog-testimonial-avatar" loading="lazy" />` : '';
        parts.push(
          `<blockquote class="blog-block-testimonial"><div class="blog-testimonial-inner">${img}<p class="blog-testimonial-quote">${quote}</p><footer><cite class="blog-testimonial-name">${name}</cite>${
            role ? `<span class="blog-testimonial-role">${role}</span>` : ''
          }<span class="blog-testimonial-stars" aria-label="${rating} of 5">${escapeHtml(stars)}</span></footer></div></blockquote>`,
        );
        break;
      }
      case 'icon_box': {
        const icon = escapeHtml(String(d.icon ?? '⭐'));
        const title = escapeHtml(String(d.title ?? ''));
        const body = escapeHtml(String(d.body ?? ''));
        parts.push(
          `<aside class="blog-block-icon-box"><span class="blog-icon-box-glyph" aria-hidden="true">${icon}</span><h4 class="blog-icon-box-title">${title}</h4><p class="blog-icon-box-body">${body}</p></aside>`,
        );
        break;
      }
      case 'video_playlist': {
        const vids = Array.isArray(d.videos) ? d.videos : [];
        const layout = String(d.layout ?? 'stack') === 'grid' ? 'grid' : 'stack';
        let inner = '';
        for (const row of vids) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const id = extractYoutubeId(String(o.videoId ?? ''));
          if (!id) continue;
          const title = escapeHtml(String(o.title ?? ''));
          const embed = `https://www.youtube-nocookie.com/embed/${escapeHtml(id)}`;
          inner += `<figure class="blog-playlist-item"><div class="aspect-video"><iframe src="${embed}" title="${title || 'Video'}" loading="lazy" allowfullscreen></iframe></div>${
            title ? `<figcaption>${title}</figcaption>` : ''
          }</figure>`;
        }
        parts.push(`<section class="blog-block-video-playlist" data-layout="${escapeHtml(layout)}">${inner}</section>`);
        break;
      }
      case 'post_teasers': {
        const cols = Number(d.columns) === 3 ? 3 : 2;
        const items = Array.isArray(d.items) ? d.items : [];
        let inner = '';
        for (const row of items) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const title = escapeHtml(String(o.title ?? ''));
          const slug = String(o.slug ?? '').trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase();
          const excerpt = escapeHtml(String(o.excerpt ?? ''));
          const imageUrl = String(o.imageUrl ?? '').trim();
          if (!slug && !title) continue;
          const href = slug ? `/blog/${encodeURIComponent(slug)}` : '#';
          const img = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />` : '';
          inner += `<article class="blog-post-teaser"><a href="${href}" class="blog-post-teaser-link">${img}<h3>${title}</h3><p>${excerpt}</p></a></article>`;
        }
        parts.push(`<section class="blog-block-post-teasers" style="--blog-teaser-cols:${cols}">${inner}</section>`);
        break;
      }
      case 'contact_cta': {
        const title = escapeHtml(String(d.title ?? ''));
        const body = escapeHtml(String(d.body ?? ''));
        const email = String(d.email ?? '').trim();
        const btn = escapeHtml(String(d.buttonLabel ?? 'Email us'));
        const mail = email ? `mailto:${escapeHtml(email)}` : '#';
        parts.push(
          `<section class="blog-block-contact-cta"><h3>${title}</h3><p>${body}</p><p><a class="blog-btn blog-btn-primary blog-btn-md" href="${mail}">${btn}</a></p></section>`,
        );
        break;
      }
      case 'price_list': {
        const heading = escapeHtml(String(d.heading ?? ''));
        const items = Array.isArray(d.items) ? d.items : [];
        let lis = '';
        for (const row of items) {
          const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
          const label = escapeHtml(String(o.label ?? ''));
          const price = escapeHtml(String(o.price ?? ''));
          const detail = escapeHtml(String(o.detail ?? ''));
          lis += `<li><span class="blog-price-label">${label}</span><span class="blog-price-amount">${price}</span>${
            detail ? `<span class="blog-price-detail">${detail}</span>` : ''
          }</li>`;
        }
        parts.push(
          `<section class="blog-block-price-list">${heading ? `<h3>${heading}</h3>` : ''}<ul>${lis}</ul></section>`,
        );
        break;
      }
      case 'newsletter': {
        const title = escapeHtml(String(d.title ?? ''));
        const subtitle = escapeHtml(String(d.subtitle ?? ''));
        const ph = escapeHtml(String(d.placeholder ?? ''));
        const bt = escapeHtml(String(d.buttonText ?? ''));
        parts.push(
          `<section class="blog-block-newsletter"><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}<div class="blog-newsletter-fields"><input type="email" name="email" placeholder="${ph}" disabled /><button type="button" disabled>${bt}</button></div></section>`,
        );
        break;
      }
      case 'modal_popup': {
        const safeId = String(block.id).replace(/[^a-zA-Z0-9_-]/g, '-');
        const popId = `blog-pop-${safeId}`;
        const trigger = escapeHtml(String(d.triggerLabel ?? 'Open'));
        const title = escapeHtml(String(d.title ?? ''));
        const bodyRaw = String(d.body ?? '');
        const bodyHtml = escapeHtml(bodyRaw).replace(/\r\n/g, '\n').split('\n').join('<br/>');
        const align = ['left', 'center', 'right'].includes(String(d.alignTrigger)) ? String(d.alignTrigger) : 'left';
        parts.push(
          `<div class="blog-block-modal-wrap" style="text-align:${escapeHtml(align)}">` +
            `<button type="button" class="blog-modal-trigger blog-btn blog-btn-primary blog-btn-md" popovertarget="${escapeHtml(popId)}" popovertargetaction="toggle">${trigger}</button>` +
            `</div>` +
            `<div id="${escapeHtml(popId)}" popover="auto" class="blog-modal-popover">` +
            `<div class="blog-modal-panel">` +
            (title ? `<h3 class="blog-modal-title">${title}</h3>` : '') +
            `<div class="blog-modal-body">${bodyHtml}</div>` +
            `<button type="button" class="blog-modal-close blog-btn blog-btn-secondary blog-btn-sm" popovertarget="${escapeHtml(popId)}" popovertargetaction="hide">Close</button>` +
            `</div></div>`,
        );
        break;
      }
      case 'animated_headline': {
        const rawText = String(d.text ?? '').trim();
        const variantRaw = String(d.variant ?? 'fade-up');
        const variant =
          variantRaw === 'gradient' || variantRaw === 'underline' ? variantRaw : 'fade-up';
        const level = Math.min(3, Math.max(1, Number(d.level) || 2));
        const tag = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
        if (!rawText) {
          parts.push(`<${tag} class="blog-animated-headline blog-ah-empty"></${tag}>`);
          break;
        }
        if (variant === 'gradient') {
          const esc = escapeHtml(rawText);
          parts.push(
            `<${tag} class="blog-animated-headline blog-ah-gradient"><span class="blog-ah-gradient-inner">${esc}</span></${tag}>`,
          );
          break;
        }
        if (variant === 'underline') {
          const esc = escapeHtml(rawText);
          parts.push(`<${tag} class="blog-animated-headline blog-ah-underline"><span class="blog-ah-underline-inner">${esc}</span></${tag}>`);
          break;
        }
        const words = rawText.split(/\s+/).filter(Boolean);
        const spans = words
          .map((w, i) => `<span class="blog-ah-word" style="--i:${i}">${escapeHtml(w)}</span>`)
          .join('<span class="blog-ah-space"> </span>');
        parts.push(`<${tag} class="blog-animated-headline blog-ah-fade-up">${spans}</${tag}>`);
        break;
      }
      case 'carousel': {
        const items = Array.isArray(d.items) ? d.items : [];
        const slides = items
          .filter((row: unknown) => {
            const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
            return String(o.url ?? '').trim() || String(o.videoUrl ?? '').trim();
          })
          .map((row: unknown) => {
            const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
            const vid = String(o.videoUrl ?? '').trim();
            if (vid) {
              const esc = escapeHtml(vid);
              return `<figure class="blog-block-carousel-slide"><iframe src="${esc}" title="Carousel media" loading="lazy"></iframe>${
                String(o.caption ?? '').trim() ? `<figcaption>${escapeHtml(String(o.caption))}</figcaption>` : ''
              }</figure>`;
            }
            const url = escapeHtml(String(o.url ?? '').trim());
            const alt = escapeHtml(String(o.alt ?? ''));
            const cap = String(o.caption ?? '').trim();
            return `<figure class="blog-block-carousel-slide"><img src="${url}" alt="${alt}" loading="lazy" />${
              cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ''
            }</figure>`;
          })
          .join('');
        parts.push(`<section class="blog-block-carousel-static">${slides}</section>`);
        break;
      }
      default:
        parts.push(`<!-- unknown block: ${escapeHtml(block.type)} -->`);
    }
  }
  return parts.join('\n');
}
