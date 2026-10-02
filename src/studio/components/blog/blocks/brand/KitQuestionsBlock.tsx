import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import type { BlogBlock } from '../../../../lib/blog/blogBlockTypes';
import type { KitEditApi } from './KitBlocks';

type Row = Record<string, string>;

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function rows(data: Record<string, unknown>, key: string): Row[] {
  const v = data[key];
  return Array.isArray(v) ? (v as Row[]) : [];
}

function InlineText({ value, onChange, onFocus }: { value: string; onChange: (v: string) => void; onFocus?: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value;
  }, [value]);
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };
  return (
    <span
      ref={ref}
      className="kit-editable"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      title="Click to edit"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onInput={(e) => onChange((e.currentTarget.textContent ?? '').replace(/\u00a0/g, ' '))}
    />
  );
}

function Field({
  edit,
  d,
  k,
  row,
}: {
  edit: KitEditApi | null;
  d: Record<string, unknown>;
  k: string;
  row?: [string, number];
}) {
  const value = row ? (rows(d, row[0])[row[1]]?.[k] ?? '') : str(d, k);
  if (!edit) return <>{value}</>;
  const onChange = row ? (v: string) => edit.setRowField(row[0], row[1], k, v) : (v: string) => edit.setField(k, v);
  const field = row ? `${row[0]}.${row[1]}.${k}` : k;
  return <InlineText value={value} onChange={onChange} onFocus={() => edit.reveal(field)} />;
}

/** The four recognition questions and the "Me too" bridge. */
export function KitQuestionsBlock({ block, edit }: { block: BlogBlock; edit: KitEditApi | null }) {
  const d = block.data;
  const tone = d.tone === 'green' || d.tone === 'white' || d.tone === 'cream' ? d.tone : 'cream';
  const questions = rows(d, 'questions')
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.text ?? '').trim() || edit);
  const href = str(d, 'buttonHref');
  return (
    <section className={`sec ${tone}`} id={str(d, 'anchor') || undefined}>
      <div className="wrap ask">
        {str(d, 'greeting') || edit ? (
          <p className="ask-greet">
            <Field edit={edit} d={d} k="greeting" />
          </p>
        ) : null}
        {questions.length ? (
          <ul className="ask-list">
            {questions.map(({ i }) => (
              <li key={i}>
                <span className="ask-mark" aria-hidden="true" />
                <span>
                  <Field edit={edit} d={d} k="text" row={['questions', i]} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {str(d, 'heading') || edit ? (
          <h2>
            <Field edit={edit} d={d} k="heading" />
          </h2>
        ) : null}
        {str(d, 'body') || edit ? (
          <p className="ask-story">
            <Field edit={edit} d={d} k="body" />
          </p>
        ) : null}
        {str(d, 'buttonLabel') && href ? (
          <a className="btn" href={href} onClick={edit ? (e) => e.preventDefault() : undefined}>
            <Field edit={edit} d={d} k="buttonLabel" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
