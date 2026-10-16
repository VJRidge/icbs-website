import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';
import { safeHref } from '../../../lib/blog/safeHref';
import { buttonFaceClass } from '../../../lib/blog/buttonFace';
import { readDualButton } from '../../../lib/blog/marketingWidgets';

function Face({
  text,
  href,
  style,
  editing,
}: {
  text: string;
  href: string;
  style: string;
  editing: boolean;
}) {
  const className = `${buttonFaceClass(style)} px-6 py-3 text-[11px]`;
  if (editing) return <span className={className}>{text}</span>;
  return (
    <a href={href} className={className} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {text}
    </a>
  );
}

export default function BlogDualButtonBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const pair = readDualButton(block.data as Record<string, unknown>);
  const justify = pair.align === 'left' ? 'justify-start' : pair.align === 'right' ? 'justify-end' : 'justify-center';
  const leftHref = safeHref(pair.leftUrl) ?? '#';
  const rightHref = safeHref(pair.rightUrl) ?? '#';

  const pairRow = (
    <div className={`blog-dual-button my-4 flex flex-wrap items-center gap-0 ${justify}`}>
      <Face text={pair.leftText} href={leftHref} style={pair.leftStyle} editing={isEditing} />
      {pair.divider ? (
        <span className="relative z-[1] -mx-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[9px] font-black uppercase tracking-widest text-slate-500 shadow ring-1 ring-slate-200">
          {pair.divider}
        </span>
      ) : null}
      <Face text={pair.rightText} href={rightHref} style={pair.rightStyle} editing={isEditing} />
    </div>
  );

  if (!isEditing) return pairRow;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={pair.leftText}
          onChange={(event) => updateBlock(block.id, { leftText: event.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={pair.leftUrl}
          onChange={(event) => updateBlock(block.id, { leftUrl: event.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        />
        <input
          value={pair.rightText}
          onChange={(event) => updateBlock(block.id, { rightText: event.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={pair.rightUrl}
          onChange={(event) => updateBlock(block.id, { rightUrl: event.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
        />
      </div>
      <input
        value={pair.divider}
        onChange={(event) => updateBlock(block.id, { divider: event.target.value })}
        placeholder="OR"
        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-black uppercase"
      />
      {pairRow}
    </div>
  );
}
