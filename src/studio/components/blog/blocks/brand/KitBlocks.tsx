import { Fragment, createContext, useContext, useEffect, useLayoutEffect, useState, useRef, type KeyboardEvent, type ReactNode } from 'react';
import SignupForm from '../../../../../components/SignupForm';
import SiteSocial from '../../../../../components/SiteSocial';
import { EMPTY_SOCIAL, loadSiteChromeOnce, type SiteSocial as SocialMap } from '../../../../../lib/siteChrome';
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
function KitForm({ id, label, companion }: { id: string; label: string; companion?: ReactNode }) {
  const editing = useContext(KitEditContext) !== null;
  const form = <SignupForm id={`kit-${id}`} buttonLabel={label || undefined} companion={companion} />;
  return editing ? <div inert>{form}</div> : form;
}

function useSetField() {
  const edit = useContext(KitEditContext);
  return (key: string) => (url: string) => edit?.setField(key, url);
}

function useSocial(): SocialMap {
  const [social, setSocial] = useState<SocialMap>(EMPTY_SOCIAL);
  useEffect(() => {
    void loadSiteChromeOnce().then((chrome) => setSocial(chrome.social));
  }, []);
  return social;
}

function HeroButton({
  d,
  labelKey,
  hrefKey,
  className,
  edit,
}: {
  d: Record<string, unknown>;
  labelKey: string;
  hrefKey: string;
  className: string;
  edit: boolean;
}) {
  if (!str(d, hrefKey) || !str(d, labelKey)) return null;
  return (
    <a className={className} href={str(d, hrefKey)} onClick={edit ? (e) => e.preventDefault() : undefined}>
      <Txt d={d} k={labelKey} />
    </a>
  );
}

function KitHero({ block }: { block: BlogBlock }) {
  const d = block.data;
  const setField = useSetField();
  const edit = useContext(KitEditContext);
  const social = useSocial();
  const receipts = rows(d, 'receipts')
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => (r.value ?? '').trim() || (r.label ?? '').trim());
  const cover = str(d, 'coverUrl');
  return (
    <div className="green" id={str(d, 'anchor') || undefined}>
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
            ) : (
              <span />
            )}
            <SiteSocial social={social} />
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
            {d.showForm !== false ? (
              <KitForm
                id={block.id}
                label={str(d, 'buttonLabel')}
                companion={<HeroButton d={d} labelKey="button2Label" hrefKey="button2Href" className="btn ghost" edit={!!edit} />}
              />
            ) : (
              <div className="hero-actions">
                <HeroButton d={d} labelKey="buttonLabel" hrefKey="buttonHref" className="btn" edit={!!edit} />
                <HeroButton d={d} labelKey="button2Label" hrefKey="button2Href" className="btn ghost" edit={!!edit} />
              </div>
            )}
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

function columnRows(d: Record<string, unknown>): Record<string, unknown>[] {
  const v = d.columns;
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function groupRows(d: Record<string, unknown>): Record<string, unknown>[] {
  const v = d.groups;
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function Mark({ value }: { value: string }) {
  const v = value.trim();
  const low = v.toLowerCase();
  if (v === '✓' || low === 'yes' || low === 'included') return <span className="cmp-yes">✓</span>;
  if (low === 'preview') return <span className="cmp-preview">Preview</span>;
  if (low === '—' || low === '-' || low === 'no') return <span className="cmp-no">—</span>;
  if (low.includes('full')) return <span className="cmp-full">Full version</span>;
  if (!v) return <span className="cmp-no">—</span>;
  return <span className="cmp-full">{v}</span>;
}

function KitContents({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'cream');
  const items = rows(d, 'items');
  const compare = d.layout === 'compare';
  const columns = columnRows(d).slice(0, 2);
  const centered = compare || d.centered === true;
  return (
    <section className={`sec ${t}`} id={str(d, 'anchor') || undefined}>
      <div className={centered ? 'wrap center' : 'wrap'}>
        <SectionLabel d={d} t={t} centered={centered} />
        {str(d, 'heading') ? (
          <h2 className={centered ? 'center' : undefined}>
            <Txt d={d} k="heading" />
          </h2>
        ) : null}
        {str(d, 'lede') || str(d, 'ledeHighlight') ? (
          <p className="lede" style={centered ? { marginInline: 'auto' } : undefined}>
            <Txt d={d} k="lede" />
            {str(d, 'lede') && str(d, 'ledeHighlight') ? ' ' : null}
            {str(d, 'ledeHighlight') ? (
              <mark>
                <Txt d={d} k="ledeHighlight" />
              </mark>
            ) : null}
          </p>
        ) : null}
        {compare && groupRows(d).length ? (
          <ComparisonTable columns={columns} groups={groupRows(d)} />
        ) : null}
        {compare && !groupRows(d).length ? (
          <div className="compare">
            {columns.map((col, i) => {
              const lines = Array.isArray(col.items) ? (col.items as Row[]) : [];
              const href = typeof col.ctaHref === 'string' ? col.ctaHref : '';
              const label = typeof col.ctaLabel === 'string' ? col.ctaLabel : '';
              return (
                <article className="compare-col" key={i}>
                  {typeof col.note === 'string' && col.note ? <div className="compare-note">{col.note}</div> : null}
                  {typeof col.heading === 'string' && col.heading ? <h3>{col.heading}</h3> : null}
                  {lines.length ? (
                    <ul>
                      {lines.map((line, n) => (
                        <li key={n}>{line.title ?? ''}</li>
                      ))}
                    </ul>
                  ) : null}
                  {href && label ? (
                    <a className={i === 0 ? 'btn line' : 'btn'} href={href}>
                      {label}
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
        {!compare && items.length ? (
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

function ComparisonTable({ columns, groups }: { columns: Record<string, unknown>[]; groups: Record<string, unknown>[] }) {
  const heads = [0, 1].map((i) => columns[i] ?? {});
  return (
    <>
      <div className="cmp">
        <table>
          <thead>
            <tr>
              <th scope="col" />
              {heads.map((col, i) => (
                <th scope="col" key={i}>
                  {typeof col.heading === 'string' ? col.heading : ''}
                  {typeof col.note === 'string' && col.note ? <span className="cmp-price">{col.note}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => {
              const lines = Array.isArray(group.rows) ? (group.rows as Row[]) : [];
              return (
                <Fragment key={gi}>
                  <tr className="cmp-sec">
                    <th scope="row">{typeof group.label === 'string' ? group.label : ''}</th>
                    <td>{typeof group.kitCount === 'string' ? group.kitCount : ''}</td>
                    <td>{typeof group.bookCount === 'string' ? group.bookCount : ''}</td>
                  </tr>
                  {lines.map((line, n) => (
                    <tr className="cmp-row" key={n}>
                      <th scope="row">{line.title ?? ''}</th>
                      <td>
                        <Mark value={line.kit ?? ''} />
                      </td>
                      <td>
                        <Mark value={line.book ?? ''} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cmp-actions">
        {heads.map((col, i) => {
          const href = typeof col.ctaHref === 'string' ? col.ctaHref : '';
          const label = typeof col.ctaLabel === 'string' ? col.ctaLabel : '';
          if (!href || !label) return null;
          return (
            <a key={i} className={i === 0 ? 'btn line' : 'btn'} href={href}>
              {label}
            </a>
          );
        })}
      </div>
    </>
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
  const setField = useSetField();
  const centered = d.centered === true;
  const showImage = d.showImage === true;
  const imageUrl = str(d, 'imageUrl');
  const href = str(d, 'buttonHref');
  const parts = str(d, 'body').split(/\n{2,}/);
  const paragraphs = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.trim());
  const setParagraph = (i: number, v: string) => {
    const next = [...parts];
    next[i] = v;
    edit?.setField('body', next.join('\n\n'));
  };
  const centerStyle = centered ? { marginInline: 'auto' } : undefined;
  const frame = centered ? { marginInline: 'auto' as const } : undefined;
  const portrait = showImage ? (
    imageUrl ? (
      <Img src={imageUrl} alt={str(d, 'imageAlt')} className="portrait" style={frame} field="imageUrl" onPick={setField('imageUrl')} />
    ) : (
      <div className="portrait portrait-ph" style={frame}>{str(d, 'imageAlt') || 'Author photo'}</div>
    )
  ) : null;
  return (
    <section className={`sec ${t}`} id={str(d, 'anchor') || undefined}>
      <div className={centered ? 'wrap center' : 'wrap'}>
        <div className={showImage && !centered ? 'bio' : undefined}>
          {portrait}
          <div>
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
        </div>
      </div>
    </section>
  );
}

function KitSignup({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'green');
  return (
    <section className={`sec ${t}`} id={str(d, 'anchor') || undefined}>
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
