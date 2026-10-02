import { useEffect } from 'react';
import { ArrowDown, ArrowUp, Images, Plus, Trash2 } from 'lucide-react';
import { useBlogEditorStore } from '../../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../../lib/blog/blogBlockTypes';
import { useBlogAdminMediaLibrary } from '../../../../contexts/BlogAdminMediaLibraryContext';
import FileUpload from '../../../FileUpload';
import { scrollToKitField, subscribeKitField, takePendingKitField } from './kitFieldFocus';

type Row = Record<string, string>;
type Update = (patch: Record<string, unknown>) => void;

const labelCls = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400';
const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-blue/50';

function Text({ data, k, label, update, multiline, hint }: {
  data: Record<string, unknown>;
  k: string;
  label: string;
  update: Update;
  multiline?: boolean;
  hint?: string;
}) {
  const value = typeof data[k] === 'string' ? (data[k] as string) : '';
  return (
    <label className="block" data-kit-field={k}>
      <span className={labelCls}>{label}</span>
      {multiline ? (
        <textarea value={value} rows={4} onChange={(e) => update({ [k]: e.target.value })} className={`${inputCls} resize-y`} />
      ) : (
        <input value={value} onChange={(e) => update({ [k]: e.target.value })} className={inputCls} />
      )}
      {hint ? <span className="mt-1 block text-[10px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

function Tone({ data, update }: { data: Record<string, unknown>; update: Update }) {
  const current = typeof data.tone === 'string' ? data.tone : 'cream';
  const tones = [
    { id: 'green', label: 'Green', swatch: '#072a1b' },
    { id: 'cream', label: 'Cream', swatch: '#f4efe3' },
    { id: 'white', label: 'White', swatch: '#ffffff' },
  ];
  return (
    <div>
      <span className={labelCls}>Background</span>
      <div className="flex gap-2">
        {tones.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => update({ tone: t.id })}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
              current === t.id ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-slate-200'
            }`}
          >
            <span className="h-3.5 w-3.5 rounded-full border border-slate-300" style={{ background: t.swatch }} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ data, k, label, update, defaultOn }: {
  data: Record<string, unknown>;
  k: string;
  label: string;
  update: Update;
  defaultOn?: boolean;
}) {
  const on = defaultOn ? data[k] !== false : data[k] === true;
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={on} onChange={(e) => update({ [k]: e.target.checked })} />
      {label}
    </label>
  );
}

function ImageField({ value, onChange, label, field }: { value: string; onChange: (url: string) => void; label: string; field: string }) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  return (
    <div className="space-y-2" data-kit-field={field}>
      <span className={labelCls}>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <FileUpload variant="compact" bucket="media-public" type="image" accept="image/*" value={value} onChange={onChange} />
        <button
          type="button"
          onClick={() => openMediaLibrary(onChange)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-brand-blue/40"
        >
          <Images size={14} /> Library
        </button>
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/img/... or https://..." className={inputCls} />
    </div>
  );
}

function RowList({ data, k, update, fields, addLabel, blank }: {
  data: Record<string, unknown>;
  k: string;
  update: Update;
  fields: { key: string; label: string; width?: string; image?: boolean }[];
  addLabel: string;
  blank: Row;
}) {
  const list = Array.isArray(data[k]) ? (data[k] as Row[]) : [];
  const set = (next: Row[]) => update({ [k]: next });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return (
    <div className="space-y-2">
      {list.map((row, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
          <div className="flex flex-wrap gap-2">
            {fields
              .filter((f) => !f.image)
              .map((f) => (
                <input
                  key={f.key}
                  data-kit-field={`${k}.${i}.${f.key}`}
                  value={row[f.key] ?? ''}
                  placeholder={f.label}
                  aria-label={f.label}
                  onChange={(e) => {
                    const next = [...list];
                    next[i] = { ...row, [f.key]: e.target.value };
                    set(next);
                  }}
                  className={`${inputCls} ${f.width ?? 'flex-1'} min-w-0 py-1.5`}
                />
              ))}
          </div>
          {fields
            .filter((f) => f.image)
            .map((f) => (
              <ImageField
                key={f.key}
                field={`${k}.${i}.${f.key}`}
                label={f.label}
                value={row[f.key] ?? ''}
                onChange={(url) => {
                  const next = [...list];
                  next[i] = { ...row, [f.key]: url };
                  set(next);
                }}
              />
            ))}
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move up">
              <ArrowUp size={14} />
            </button>
            <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Move down">
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => set(list.filter((_, j) => j !== i))}
              className="rounded p-1 text-red-500 hover:bg-red-50"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...list, { ...blank }])}
        className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
      >
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

type CompareCol = { heading?: string; note?: string; ctaLabel?: string; ctaHref?: string; items?: Row[] };

function CompareColumns({ data, update }: { data: Record<string, unknown>; update: Update }) {
  const raw = Array.isArray(data.columns) ? (data.columns as CompareCol[]) : [];
  const columns: CompareCol[] = [0, 1].map((i) => raw[i] ?? { heading: '', note: '', ctaLabel: '', ctaHref: '', items: [] });
  const setCol = (i: number, patch: Partial<CompareCol>) => {
    const next = columns.map((col, n) => (n === i ? { ...col, ...patch } : col));
    update({ columns: next });
  };
  return (
    <>
      {columns.map((col, i) => (
        <Group key={i} title={i === 0 ? 'Left column' : 'Right column'}>
          <label className="block">
            <span className={labelCls}>Heading</span>
            <input value={col.heading ?? ''} onChange={(e) => setCol(i, { heading: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Price note</span>
            <input value={col.note ?? ''} onChange={(e) => setCol(i, { note: e.target.value })} className={inputCls} />
          </label>
          <RowList
            data={{ items: col.items ?? [] }}
            k="items"
            update={(patch) => setCol(i, { items: patch.items as Row[] })}
            fields={[{ key: 'title', label: 'Included' }]}
            addLabel="Add line"
            blank={{ title: '' }}
          />
          <label className="block">
            <span className={labelCls}>Button label</span>
            <input value={col.ctaLabel ?? ''} onChange={(e) => setCol(i, { ctaLabel: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Button link</span>
            <input value={col.ctaHref ?? ''} onChange={(e) => setCol(i, { ctaHref: e.target.value })} className={inputCls} />
          </label>
        </Group>
      ))}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-700">{title}</legend>
      {children}
    </fieldset>
  );
}

const HIGHLIGHT_HINT = 'Shown with the yellow highlighter.';

/** Scrolls to (and flashes) the field matching whatever was clicked on the canvas. */
export default function KitBlockFields({ block }: { block: BlogBlock }) {
  const blockId = block.id;

  useEffect(() => {
    const pending = takePendingKitField(blockId);
    if (pending) requestAnimationFrame(() => scrollToKitField(blockId, pending));
    return subscribeKitField((t) => {
      if (t.blockId !== blockId) return;
      takePendingKitField(blockId);
      scrollToKitField(blockId, t.field);
    });
  }, [blockId]);

  return (
    <div data-kit-fields-for={blockId}>
      <KitBlockFieldsInner block={block} />
    </div>
  );
}

function KitBlockFieldsInner({ block }: { block: BlogBlock }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const d = block.data;
  const update: Update = (patch) => updateBlock(block.id, patch);

  switch (block.type) {
    case 'kit_hero':
      return (
        <div className="space-y-4">
          <Group title="Top bar">
            <Toggle data={d} k="showNav" label="Show inner kit nav" update={update} defaultOn />
            <Text data={d} k="tag" label="Tag" update={update} />
            <Text data={d} k="tagline" label="Tagline" update={update} />
          </Group>
          <Group title="Headline">
            <Text data={d} k="headlineBefore" label="Before highlight" update={update} />
            <Text data={d} k="highlight" label="Highlighted words" update={update} hint={HIGHLIGHT_HINT} />
            <Text data={d} k="headlineAfter" label="After highlight" update={update} />
            <Text data={d} k="subhead" label="Subhead" update={update} multiline />
          </Group>
          <Group title="Cover">
            <ImageField label="Cover image" field="coverUrl" value={String(d.coverUrl ?? '')} onChange={(url) => update({ coverUrl: url })} />
            <Text data={d} k="coverAlt" label="Alt text" update={update} />
          </Group>
          <Group title="Signup form">
            <Toggle data={d} k="showForm" label="Show signup form" update={update} defaultOn />
            <Text data={d} k="buttonLabel" label="Button label" update={update} />
            <Text data={d} k="buttonHref" label="Button link (when form is off)" update={update} hint="e.g. #buy or a Stripe URL" />
            <Text data={d} k="button2Label" label="Second button label" update={update} />
            <Text data={d} k="button2Href" label="Second button link" update={update} hint="Outline button. e.g. /free" />
          </Group>
          <Group title="Receipts strip">
            <RowList
              data={d}
              k="receipts"
              update={update}
              fields={[
                { key: 'value', label: 'Number', width: 'w-24' },
                { key: 'label', label: 'Label' },
              ]}
              addLabel="Add number"
              blank={{ value: '', label: '' }}
            />
          </Group>
        </div>
      );
    case 'kit_contents':
      return (
        <div className="space-y-4">
          <Group title="Section">
            <Tone data={d} update={update} />
            <Text data={d} k="label" label="Label" update={update} />
            <Text data={d} k="heading" label="Heading" update={update} />
            <Text data={d} k="lede" label="Intro" update={update} multiline />
            <Text data={d} k="ledeHighlight" label="Highlighted sentence" update={update} hint={HIGHLIGHT_HINT} />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={d.layout === 'compare'}
                onChange={(e) => update({ layout: e.target.checked ? 'compare' : 'list' })}
              />
              Two columns: free kit vs book
            </label>
          </Group>
          {d.layout === 'compare' ? (
            <CompareColumns data={d} update={update} />
          ) : (
            <Group title="Contents">
              <RowList
                data={d}
                k="items"
                update={update}
                fields={[
                  { key: 'number', label: 'No.', width: 'w-14' },
                  { key: 'title', label: 'Title' },
                  { key: 'kind', label: 'Type', width: 'w-24' },
                ]}
                addLabel="Add row"
                blank={{ number: '', title: '', kind: '' }}
              />
            </Group>
          )}
        </div>
      );
    case 'kit_gallery':
      return (
        <div className="space-y-4">
          <Group title="Section">
            <Tone data={d} update={update} />
            <Text data={d} k="label" label="Label" update={update} />
            <Text data={d} k="heading" label="Heading" update={update} />
            <Text data={d} k="caption" label="Caption" update={update} />
          </Group>
          <Group title="Images">
            <RowList
              data={d}
              k="images"
              update={update}
              fields={[
                { key: 'alt', label: 'Alt text' },
                { key: 'url', label: 'Image', image: true },
              ]}
              addLabel="Add image"
              blank={{ url: '', alt: '' }}
            />
          </Group>
        </div>
      );
    case 'kit_closing':
      return (
        <div className="space-y-4">
          <Group title="Section">
            <Tone data={d} update={update} />
            <Text data={d} k="headlineBefore" label="Headline" update={update} multiline />
            <Text data={d} k="highlight" label="Highlighted words" update={update} hint={HIGHLIGHT_HINT} />
          </Group>
          <Group title="Signup form">
            <Text data={d} k="label" label="Label above form" update={update} />
            <Text data={d} k="buttonLabel" label="Button label" update={update} />
          </Group>
        </div>
      );
    case 'kit_text':
      return (
        <div className="space-y-4">
          <Group title="Section">
            <Tone data={d} update={update} />
            <Toggle data={d} k="centered" label="Center text" update={update} />
            <Text data={d} k="label" label="Label" update={update} />
            <Text data={d} k="heading" label="Heading" update={update} />
            <Text data={d} k="body" label="Body" update={update} multiline hint="Blank line between paragraphs." />
            <Text data={d} k="highlight" label="Highlighted sentence" update={update} hint={HIGHLIGHT_HINT} />
          </Group>
          <Group title="Image (optional)">
            <Toggle data={d} k="showImage" label="Show image" update={update} />
            <ImageField label="Image" field="imageUrl" value={String(d.imageUrl ?? '')} onChange={(url) => update({ imageUrl: url })} />
            <Text data={d} k="imageAlt" label="Image alt text" update={update} hint="Shown in the frame until a photo is chosen." />
          </Group>
          <Group title="Button (optional)">
            <Text data={d} k="buttonLabel" label="Label" update={update} />
            <Text data={d} k="buttonHref" label="Link" update={update} hint="e.g. /free or https://…" />
            <Text data={d} k="anchor" label="Section id" update={update} hint="e.g. buy — links can jump here with #buy" />
          </Group>
        </div>
      );
    case 'kit_signup':
      return (
        <div className="space-y-4">
          <Group title="Section">
            <Tone data={d} update={update} />
            <Text data={d} k="label" label="Label" update={update} />
            <Text data={d} k="heading" label="Heading" update={update} />
            <Text data={d} k="buttonLabel" label="Button label" update={update} />
          </Group>
        </div>
      );
    default:
      return null;
  }
}
