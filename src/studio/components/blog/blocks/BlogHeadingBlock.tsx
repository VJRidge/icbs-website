import { createElement, type CSSProperties } from 'react';
import { headingInlineHtml } from '../../../../brand/headingHighlight';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { sanitizeBlogBlockHtml } from '../../../lib/blog/sanitizeBlogBlockHtml';
import { safeHref } from '../../../lib/blog/safeHref';
import HeadingRichEditor from './HeadingRichEditor';

const SIZE_ONLY: Record<number, string> = {
  1: 'text-4xl',
  2: 'text-3xl',
  3: 'text-2xl',
  4: 'text-xl',
  5: 'text-lg',
  6: 'text-base',
};

const WEIGHT_ONLY: Record<number, string> = {
  1: 'font-black',
  2: 'font-bold',
  3: 'font-bold',
  4: 'font-semibold',
  5: 'font-semibold',
  6: 'font-semibold',
};

function px(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  return /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
}

const SOFT_SHADOW = '0 2px 10px rgba(21, 20, 18, 0.28)';

function headingNode(tag: string, className: string | undefined, style: CSSProperties, html: string) {
  return createElement(tag, { className, style, dangerouslySetInnerHTML: { __html: html } });
}

export default function BlogHeadingBlock({
  block,
  isEditing,
  canvasEdit = false,
  toolbarSource = false,
}: {
  block: BlogBlock;
  isEditing: boolean;
  canvasEdit?: boolean;
  /** Left-panel editor. The canvas copy stays in sync and does not own the toolbar. */
  toolbarSource?: boolean;
}) {
  const level = Math.min(6, Math.max(1, Number(block.data.level) || 2));
  const text = String(block.data.text ?? '');
  const role = String(block.data.role ?? '');
  const highlight = String(block.data.highlight ?? '');
  const highlightColor = String(block.data.highlightColor ?? '');
  const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const align = String(block.data.align ?? 'left');
  const color = String(block.data.color ?? '').trim();
  const fontFamily = String(block.data.fontFamily ?? '').trim();
  const fontSize = px(block.data.fontSize);
  const fontWeight = String(block.data.fontWeight ?? '').trim();
  const style: CSSProperties = {
    textAlign: align === 'center' || align === 'right' ? align : 'left',
    color: color || undefined,
    fontFamily: fontFamily || undefined,
    fontSize,
    fontWeight: fontWeight || undefined,
    textShadow: block.data.shadow === 'soft' ? SOFT_SHADOW : undefined,
  };
  const branded = role === 'kicker' || role === 'note' || role === 'card';
  const sizeClass = fontSize || branded ? '' : SIZE_ONLY[level];
  const weightClass = fontWeight || branded ? '' : WEIGHT_ONLY[level];
  if (canvasEdit || toolbarSource) {
    const editor = <HeadingRichEditor key={block.id} block={block} toolbarSource={toolbarSource} canvasSurface={canvasEdit} />;
    if (!canvasEdit) return editor;
    const liveClass = branded
      ? role === 'kicker'
        ? 'vj-k'
        : role === 'note'
          ? 'vj-note'
          : undefined
      : `${sizeClass} ${weightClass} leading-tight text-brand-blue`.trim();
    const liveTag = branded ? (role === 'card' ? 'h3' : 'p') : tag;
    return createElement(liveTag, { className: liveClass, style }, editor);
  }
  if (!text.trim() && !isEditing) return null;
  const shown = text || 'This is a title';
  const html = sanitizeBlogBlockHtml(headingInlineHtml(shown, highlight, highlightColor));
  const heading = branded
    ? role === 'kicker'
      ? headingNode('p', 'vj-k', style, html)
      : role === 'note'
        ? headingNode('p', 'vj-note', style, html)
        : headingNode('h3', undefined, style, html)
    : headingNode(tag, `${sizeClass} ${weightClass} leading-tight text-brand-blue`.trim(), style, html);

  const href = safeHref(block.data.link);
  if (!isEditing && href) {
    return (
      <a href={href} className="text-inherit no-underline">
        {heading}
      </a>
    );
  }

  return heading;
}
