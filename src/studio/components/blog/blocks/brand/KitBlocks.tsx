import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import SignupForm from '../../../../../components/SignupForm';
import type { BlogBlock, KitTone } from '../../../../lib/blog/blogBlockTypes';

type Row = Record<string, string>;

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

/** Signup forms are inert inside the editor so clicks select the block instead of submitting. */
function KitForm({ id, label, preview }: { id: string; label: string; preview: boolean }) {
  const form = <SignupForm id={`kit-${id}`} buttonLabel={label || undefined} />;
  return preview ? <div inert>{form}</div> : form;
}

function Highlight({ before, mark, after }: { before: string; mark: string; after?: string }) {
  return (
    <>
      {before}
      {mark ? <span className="y">{mark}</span> : null}
      {after}
    </>
  );
}

function KitHero({ block, preview }: { block: BlogBlock; preview: boolean }) {
  const d = block.data;
  const receipts = rows(d, 'receipts').filter((r) => (r.value ?? '').trim() || (r.label ?? '').trim());
  const cover = str(d, 'coverUrl');
  return (
    <div className="green">
      <div className="wrap">
        <div className="nav">
          {str(d, 'tag') ? <span className="k tag">{str(d, 'tag')}</span> : <span />}
          {str(d, 'tagline') ? <span className="k">{str(d, 'tagline')}</span> : null}
        </div>
        <div className="hero">
          <div className="cov">
            {cover ? <img src={cover} alt={str(d, 'coverAlt')} width={640} height={828} /> : null}
          </div>
          <div>
            <h1 className="an">
              <Highlight before={str(d, 'headlineBefore')} mark={str(d, 'highlight')} after={str(d, 'headlineAfter')} />
            </h1>
            {str(d, 'subhead') ? <p className="sub">{str(d, 'subhead')}</p> : null}
            {d.showForm !== false ? <KitForm id={block.id} label={str(d, 'buttonLabel')} preview={preview} /> : null}
          </div>
        </div>
        {receipts.length ? (
          <div className="strip">
            {receipts.map((r, i) => (
              <div key={i}>
                <b>{r.value}</b>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionLabel({ text, t, centered }: { text: string; t: KitTone; centered?: boolean }) {
  if (!text) return null;
  return <div className={['k', t === 'green' ? '' : 'o', centered ? 'center' : ''].filter(Boolean).join(' ')}>{text}</div>;
}

function KitContents({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'cream');
  const items = rows(d, 'items');
  return (
    <section className={`sec ${t}`}>
      <div className="wrap">
        <SectionLabel text={str(d, 'label')} t={t} />
        {str(d, 'heading') ? <h2>{str(d, 'heading')}</h2> : null}
        {str(d, 'lede') || str(d, 'ledeHighlight') ? (
          <p className="lede">
            {str(d, 'lede')}
            {str(d, 'lede') && str(d, 'ledeHighlight') ? ' ' : null}
            {str(d, 'ledeHighlight') ? <mark>{str(d, 'ledeHighlight')}</mark> : null}
          </p>
        ) : null}
        {items.length ? (
          <ul className="toc">
            {items.map((it, i) => (
              <li key={i}>
                <b>{it.number}</b>
                <span>{it.title}</span>
                <i>{it.kind}</i>
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
  const images = rows(d, 'images').filter((im) => (im.url ?? '').trim());
  return (
    <section className={`sec ${t}`}>
      <div className="wrap">
        <SectionLabel text={str(d, 'label')} t={t} centered />
        {str(d, 'heading') ? <h2 className="center">{str(d, 'heading')}</h2> : null}
        {images.length ? (
          <div className="pv">
            {images.map((im, i) => (
              <img key={i} src={im.url} alt={im.alt ?? ''} loading="lazy" />
            ))}
          </div>
        ) : null}
        {str(d, 'caption') ? <div className="cap">{str(d, 'caption')}</div> : null}
      </div>
    </section>
  );
}

function KitClosing({ block, preview }: { block: BlogBlock; preview: boolean }) {
  const d = block.data;
  const t = tone(d, 'green');
  return (
    <section className={`sec ${t}`}>
      <div className="wrap close">
        <h2>
          <Highlight before={str(d, 'headlineBefore')} mark={str(d, 'highlight')} />
        </h2>
        <div>
          {str(d, 'label') ? <div className="k">{str(d, 'label')}</div> : null}
          <KitForm id={block.id} label={str(d, 'buttonLabel')} preview={preview} />
        </div>
      </div>
    </section>
  );
}

function KitText({ block }: { block: BlogBlock }) {
  const d = block.data;
  const t = tone(d, 'cream');
  const centered = d.centered === true;
  const href = str(d, 'buttonHref');
  const paragraphs = str(d, 'body').split(/\n{2,}/).filter((p) => p.trim());
  return (
    <section className={`sec ${t}`}>
      <div className={centered ? 'wrap center' : 'wrap'}>
        <SectionLabel text={str(d, 'label')} t={t} centered={centered} />
        {str(d, 'heading') ? <h2 className={centered ? 'center' : undefined}>{str(d, 'heading')}</h2> : null}
        {paragraphs.map((p, i) => (
          <p key={i} className="lede" style={centered ? { marginInline: 'auto' } : undefined}>
            {p}
          </p>
        ))}
        {str(d, 'highlight') ? (
          <p className="lede" style={centered ? { marginInline: 'auto' } : undefined}>
            <mark>{str(d, 'highlight')}</mark>
          </p>
        ) : null}
        {str(d, 'buttonLabel') && href ? (
          <a className="btn" href={href} style={{ maxWidth: 440, ...(centered ? { marginInline: 'auto' } : {}) }}>
            {str(d, 'buttonLabel')}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function KitSignup({ block, preview }: { block: BlogBlock; preview: boolean }) {
  const d = block.data;
  const t = tone(d, 'green');
  return (
    <section className={`sec ${t}`}>
      <div className="wrap" style={{ maxWidth: 560 }}>
        <SectionLabel text={str(d, 'label')} t={t} />
        {str(d, 'heading') ? <h2>{str(d, 'heading')}</h2> : null}
        <KitForm id={block.id} label={str(d, 'buttonLabel')} preview={preview} />
      </div>
    </section>
  );
}

export function KitBlockView({ block, preview = false }: { block: BlogBlock; preview?: boolean }) {
  switch (block.type) {
    case 'kit_hero':
      return <KitHero block={block} preview={preview} />;
    case 'kit_contents':
      return <KitContents block={block} />;
    case 'kit_gallery':
      return <KitGallery block={block} />;
    case 'kit_closing':
      return <KitClosing block={block} preview={preview} />;
    case 'kit_text':
      return <KitText block={block} />;
    case 'kit_signup':
      return <KitSignup block={block} preview={preview} />;
    default:
      return null;
  }
}

const DESKTOP_WIDTH = 1280;

/** Scales a desktop-width render down to the canvas so the editor shows the real layout. */
function KitCanvasFrame({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const s = Math.min(1, o.clientWidth / DESKTOP_WIDTH);
      setScale(s);
      setHeight(i.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="overflow-hidden rounded-lg" style={{ height: height ?? undefined }}>
      <div
        ref={inner}
        style={{ width: DESKTOP_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left', fontFamily: 'var(--serif)', color: 'var(--ink)' }}
      >
        {children}
      </div>
    </div>
  );
}

export default function KitBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  if (!isEditing) return <KitBlockView block={block} />;
  return (
    <KitCanvasFrame>
      <KitBlockView block={block} preview />
    </KitCanvasFrame>
  );
}
