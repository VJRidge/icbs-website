import { createContext, useContext, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import SignupForm from '../../../../../components/SignupForm';
import type { BlogBlock, KitTone } from '../../../../lib/blog/blogBlockTypes';

type Row = Record<string, string>;

/** Present only on the editor canvas; lets text and images be edited in place. */
export type KitEditApi = {
  setField: (key: string, value: string) => void;
  setRowField: (list: string, index: number, field: string, value: string) => void;
  pickImage: (onPick: (url: string) => void) => void;
  /** Scroll the left panel to a field: `key`, or `list.index.key` for list rows. */
  reveal: (field: string) => void;
};

export const KitEditContext = createContext<KitEditApi | null>(null);

function str(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function rows(data: Record<string, unknown>, key: string): Row[] {
  const v = data[key];
  return Array.isArray(v) ? (v as Row[]) : [];
}

function tone(data: Record<string, unknown>, fallback: KitTone): KitTone {
  const t = data.tone;
  return t === 'green' || t === 'cream' || t === 'white' ? t : fallback;
}

/** Plain-text inline editor. Uses textContent (innerText would bake in CSS text-transform). */
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

/** A text field from `block.data` (or a list row): plain text publicly, editable on the canvas. */
function Txt({ d, k, row }: { d: Record<string, unknown>; k: string; row?: [string, number] }) {
  const edit = useContext(KitEditContext);
  const value = row ? (rows(d, row[0])[row[1]]?.[k] ?? '') : str(d, k);
  if (!edit) return <>{value}</>;
  const onChange = row ? (v: string) => edit.setRowField(row[0], row[1], k, v) : (v: string) => edit.setField(k, v);
  const field = row ? `${row[0]}.${row[1]}.${k}` : k;
  return <InlineText value={value} onChange={onChange} onFocus={() => edit.reveal(field)} />;
}

function Img({
  src,
  alt,
  onPick,
  field,
  ...rest
}: { src: string; alt: string; onPick: (url: string) => void; field: string } & React.ImgHTMLAttributes<HTMLImageElement>) {
  const edit = useContext(KitEditContext);
  if (!edit) return <img src={src} alt={alt} {...rest} />;
  return (
    <img
      src={src}
      alt={alt}
      {...rest}
      className={[rest.className, 'kit-editable-img'].filter(Boolean).join(' ')}
      title="Click to replace image"
      onClick={() => {
        edit.reveal(field);
        edit.pickImage(onPick);
      }}
    />
  );
}

/** Signup forms are inert inside the editor so clicks select the block instead of submitting. */
function KitForm({ id, label }: { id: string; label: string }) {
  const editing = useContext(KitEditContext) !== null;
  const form = <SignupForm id={`kit-${id}`} buttonLabel={label || undefined} />;
  return editing ? <div inert>{form}</div> : form;
}

function useSetField() {
  const edit = useContext(KitEditContext);
  return (key: string) => (url: string) => edit?.setField(key, url);
}

function KitHero({ block }: { block: BlogBlock }) {
  const d = block.data;
  const setField = useSetField();
  const edit = useContext(KitEditContext);
  const receipts = rows(d, 'receipts')
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.value ?? '').trim() || (r.label ?? '').trim());
  const cover = str(d, 'coverUrl');
  return (
    <div className="green">
      <div className="wrap">
        {d.showNav !== false ? (
          <div className="nav">
            {str(d, 'tag') ? (
              <span className="k tag">
                <Txt d={d} k="tag" />
              </span>
            ) : (
              <span />
            )}
            {str(d, 'tagline') ? (
              <span className="k">
                <Txt d={d} k="tagline" />
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="hero">
          <div className="cov">
            {cover ? <Img src={cover} alt={str(d, 'coverAlt')} width={640} height={828} field="coverUrl" onPick={setField('coverUrl')} /> : null}
          </div>
          <div>
            <h1 className="an">
              <Txt d={d} k="headlineBefore" />
              {str(d, 'highlight') || edit ? (
                <span className="y">
                  <Txt d={d} k="highlight" />
                </span>
              ) : null}
              <Txt d={d} k="headlineAfter" />
            </h1>
            {str(d, 'subhead') ? (
              <p className="sub">
                <Txt d={d} k="subhead" />
              </p>
            ) : null}
            {d.showForm !== false ? <KitForm id={block.id} label={str(d, 'buttonLabel')} /> : null}
          </div>
        </div>
        {receipts.length ? (
          <div className="strip">
            {receipts.map(({ i }) => (
              <div key={i}>
                <b>
                  <Txt d={d} k="value" row={['receipts', i]} />
                </b>
                <span>
                  <Txt d={d} k="label" row={['receipts', i]} />
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionLabel({ d, t, centered }: { d: Record<string, unknown>; t: KitTone; centered?: boolean }) {
  if (!str(d, 'label')) return null;
  return (
    <div className={['k', t === 'green' ? '' : 'o', centered ? 'center' : ''].filter(Boolean).join(' ')}>
      <Txt d={d} k="label" />
    </div>
  );
}

function KitContents({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'cream');
  const items = rows(d, 'items');
  return (
    <section className={`sec ${t}`}>
      <div className="wrap">
        <SectionLabel d={d} t={t} />
        {str(d, 'heading') ? (
          <h2>
            <Txt d={d} k="heading" />
          </h2>
        ) : null}
        {str(d, 'lede') || str(d, 'ledeHighlight') ? (
          <p className="lede">
            <Txt d={d} k="lede" />
            {str(d, 'lede') && str(d, 'ledeHighlight') ? ' ' : null}
            {str(d, 'ledeHighlight') ? (
              <mark>
                <Txt d={d} k="ledeHighlight" />
              </mark>
            ) : null}
          </p>
        ) : null}
        {items.length ? (
          <ul className="toc">
            {items.map((_, i) => (
              <li key={i}>
                <b>
                  <Txt d={d} k="number" row={['items', i]} />
                </b>
                <span>
                  <Txt d={d} k="title" row={['items', i]} />
                </span>
                <i>
                  <Txt d={d} k="kind" row={['items', i]} />
                </i>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function KitGallery({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'white');
  const edit = useContext(KitEditContext);
  const images = rows(d, 'images')
    .map((im, i) => ({ im, i }))
    .filter(({ im }) => (im.url ?? '').trim());
  return (
    <section className={`sec ${t}`}>
      <div className="wrap">
        <SectionLabel d={d} t={t} centered />
        {str(d, 'heading') ? (
          <h2 className="center">
            <Txt d={d} k="heading" />
          </h2>
        ) : null}
        {images.length ? (
          <div className="pv">
            {images.map(({ im, i }) => (
              <Img
                key={i}
                src={im.url}
                alt={im.alt ?? ''}
                loading="lazy"
                field={`images.${i}.url`}
                onPick={(url) => edit?.setRowField('images', i, 'url', url)}
              />
            ))}
          </div>
        ) : null}
        {str(d, 'caption') ? (
          <div className="cap">
            <Txt d={d} k="caption" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KitClosing({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'green');
  const edit = useContext(KitEditContext);
  return (
    <section className={`sec ${t}`}>
      <div className="wrap close">
        <h2>
          <Txt d={d} k="headlineBefore" />
          {str(d, 'highlight') || edit ? (
            <span className="y">
              <Txt d={d} k="highlight" />
            </span>
          ) : null}
        </h2>
        <div>
          {str(d, 'label') ? (
            <div className="k">
              <Txt d={d} k="label" />
            </div>
          ) : null}
          <KitForm id={block.id} label={str(d, 'buttonLabel')} />
        </div>
      </div>
    </section>
  );
}

function KitText({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'cream');
  const edit = useContext(KitEditContext);
  const centered = d.centered === true;
  const href = str(d, 'buttonHref');
  const parts = str(d, 'body').split(/\n{2,}/);
  const paragraphs = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.trim());
  const setParagraph = (i: number, v: string) => {
    const next = [...parts];
    next[i] = v;
    edit?.setField('body', next.join('\n\n'));
  };
  const centerStyle = centered ? { marginInline: 'auto' } : undefined;
  return (
    <section className={`sec ${t}`}>
      <div className={centered ? 'wrap center' : 'wrap'}>
        <SectionLabel d={d} t={t} centered={centered} />
        {str(d, 'heading') ? (
          <h2 className={centered ? 'center' : undefined}>
            <Txt d={d} k="heading" />
          </h2>
        ) : null}
        {paragraphs.map(({ p, i }) => (
          <p key={i} className="lede" style={centerStyle}>
            {edit ? <InlineText value={p} onChange={(v) => setParagraph(i, v)} onFocus={() => edit.reveal('body')} /> : p}
          </p>
        ))}
        {str(d, 'highlight') ? (
          <p className="lede" style={centerStyle}>
            <mark>
              <Txt d={d} k="highlight" />
            </mark>
          </p>
        ) : null}
        {str(d, 'buttonLabel') && href ? (
          <a
            className="btn"
            href={href}
            style={{ maxWidth: 440, ...(centered ? { marginInline: 'auto' } : {}) }}
            onClick={edit ? (e) => e.preventDefault() : undefined}
          >
            <Txt d={d} k="buttonLabel" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

function KitSignup({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'green');
  return (
    <section className={`sec ${t}`}>
      <div className="wrap" style={{ maxWidth: 560 }}>
        <SectionLabel d={d} t={t} />
        {str(d, 'heading') ? (
          <h2>
            <Txt d={d} k="heading" />
          </h2>
        ) : null}
        <KitForm id={block.id} label={str(d, 'buttonLabel')} />
      </div>
    </section>
  );
}

export function KitBlockView({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'kit_hero':
      return <KitHero block={block} />;
    case 'kit_contents':
      return <KitContents block={block} />;
    case 'kit_gallery':
      return <KitGallery block={block} />;
    case 'kit_closing':
      return <KitClosing block={block} />;
    case 'kit_text':
      return <KitText block={block} />;
    case 'kit_signup':
      return <KitSignup block={block} />;
    default:
      return null;
  }
}
