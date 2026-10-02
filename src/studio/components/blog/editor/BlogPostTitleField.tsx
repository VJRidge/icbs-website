import { useCallback, useEffect, useRef } from 'react';

type BlogPostTitleFieldProps = {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
};

export default function BlogPostTitleField({
  value,
  onChange,
  placeholder = 'Title',
}: BlogPostTitleFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <div className="shrink-0 px-6">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        className="block w-full resize-none overflow-hidden break-words border-none bg-transparent px-1 pb-0 pt-1 font-serif text-3xl font-black leading-tight text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-0 sm:text-4xl"
      />
    </div>
  );
}
