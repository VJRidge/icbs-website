import { useCallback, useEffect, useRef } from 'react';
import { STUDIO_POST_TITLE_ID } from '../../../lib/cms/cmsEditorActions';

type BlogPostTitleFieldProps = {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
  needsAttention?: boolean;
};

export default function BlogPostTitleField({
  value,
  onChange,
  placeholder = 'Title',
  needsAttention = false,
}: BlogPostTitleFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const empty = !value.trim();

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useEffect(() => {
    if (!needsAttention) return;
    ref.current?.focus();
  }, [needsAttention]);

  return (
    <div className="shrink-0 px-6">
      <textarea
        id={STUDIO_POST_TITLE_ID}
        ref={ref}
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-required="true"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        className={`block w-full resize-none overflow-hidden break-words border-none bg-transparent px-1 pb-0 pt-1 font-serif text-3xl font-black leading-tight text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-4xl ${
          needsAttention && empty
            ? 'rounded-md ring-2 ring-amber-400 ring-offset-2 ring-offset-[#F3EDE3]'
            : 'focus:ring-0'
        }`}
      />
      {empty ? (
        <p className={`mt-1 px-1 text-[11px] ${needsAttention ? 'font-semibold text-amber-800' : 'text-slate-500'}`}>
          Required to preview, save, or publish. This is the name in the posts list — not the heading inside the
          article.
        </p>
      ) : null}
    </div>
  );
}
