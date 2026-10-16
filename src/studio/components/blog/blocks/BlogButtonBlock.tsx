import { safeHref } from '../../../lib/blog/safeHref';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { buttonFaceClass, buttonFaceStyle } from '../../../lib/blog/buttonFace';
import '../../../../brand/brand.css';

export default function BlogButtonBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const text = String(block.data.text ?? 'Click here');
  const url = String(block.data.url ?? '#');
  const href = safeHref(url) ?? '#';
  const style = String(block.data.style ?? 'primary');
  const align = String(block.data.align ?? 'left');
  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const face = buttonFaceStyle(block.data as Record<string, unknown>);
  const className = buttonFaceClass(style, Boolean(block.data.brandFace));
  const label = text || 'Button';
  const button = isEditing ? (
    <span className={className} style={face}>
      {label}
    </span>
  ) : (
    <a href={href} className={className} style={face} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {label}
    </a>
  );

  return <div className={`my-3 flex w-full ${justify}`}>{button}</div>;
}
