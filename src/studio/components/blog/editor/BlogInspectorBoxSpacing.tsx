import { useState } from 'react';
import { Link2, Link2Off } from 'lucide-react';
import { readMarginBox, readPaddingBox, type BoxSides } from '../../../lib/blog/boxSpacing';
import BlogInspectorSection from './BlogInspectorSection';

const MAX = 800;

function SideInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block min-w-0 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
      <span className="mb-1 block">{label}</span>
      <input
        type="number"
        min={0}
        max={MAX}
        value={value}
        onChange={(event) => onChange(Math.max(0, Math.min(MAX, Number(event.target.value) || 0)))}
        className="w-full rounded-lg border border-slate-200 px-1.5 py-1.5 text-center text-sm text-slate-800"
      />
    </label>
  );
}

function BoxGroup({
  label,
  hint,
  box,
  onChange,
}: {
  label: string;
  hint: string;
  box: BoxSides;
  onChange: (next: BoxSides) => void;
}) {
  const [linked, setLinked] = useState(false);
  const setSide = (side: keyof BoxSides, n: number) => {
    if (linked) {
      onChange({ top: n, right: n, bottom: n, left: n });
      return;
    }
    onChange({ ...box, [side]: n });
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
        <button
          type="button"
          title={linked ? 'Unlink sides' : 'Link sides'}
          aria-pressed={linked}
          onClick={() => setLinked((on) => !on)}
          className={`rounded-lg border p-1.5 ${
            linked ? 'border-brand-blue bg-brand-blue/10 text-brand-blue' : 'border-slate-200 text-slate-500'
          }`}
        >
          {linked ? <Link2 size={14} /> : <Link2Off size={14} />}
        </button>
      </div>
      <div className="mx-auto grid max-w-[13rem] grid-cols-3 items-center gap-1.5">
        <div />
        <SideInput label="Top" value={box.top} onChange={(n) => setSide('top', n)} />
        <div />
        <SideInput label="Left" value={box.left} onChange={(n) => setSide('left', n)} />
        <div className="self-center text-center text-[9px] font-black uppercase tracking-widest text-slate-300">px</div>
        <SideInput label="Right" value={box.right} onChange={(n) => setSide('right', n)} />
        <div />
        <SideInput label="Bottom" value={box.bottom} onChange={(n) => setSide('bottom', n)} />
        <div />
      </div>
    </div>
  );
}

export default function BlogInspectorBoxSpacing({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const margin = readMarginBox(data);
  const padding = readPaddingBox(data);
  return (
    <BlogInspectorSection title="Layout">
      <div className="space-y-5">
        <BoxGroup
          label="Margin"
          hint="Space outside this section. Does not fill with the background."
          box={margin}
          onChange={(next) =>
            onChange({
              marginTop: next.top,
              marginRight: next.right,
              marginBottom: next.bottom,
              marginLeft: next.left,
            })
          }
        />
        <BoxGroup
          label="Padding"
          hint="Space inside this section. Grows the background color."
          box={padding}
          onChange={(next) =>
            onChange({
              paddingTop: next.top,
              padTop: next.top,
              paddingRight: next.right,
              paddingBottom: next.bottom,
              padBottom: next.bottom,
              paddingLeft: next.left,
            })
          }
        />
      </div>
    </BlogInspectorSection>
  );
}
