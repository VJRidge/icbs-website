import type { ReactNode } from 'react';

export const mediaInput = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800';
export const mediaLabel = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400';

export function MediaSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs text-slate-700">
      <span className={mediaLabel}>{label}</span>
      <select className={mediaInput} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function MediaToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-slate-700">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full ${checked ? 'bg-[#7c3aed]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function MediaRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-slate-700">
      <span className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
        <span className="font-semibold normal-case tracking-normal text-slate-500">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#7c3aed]"
      />
    </label>
  );
}

export function MediaColor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-slate-700">
      <span>{label}</span>
      <input
        type="color"
        value={value || '#ffffff'}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
        aria-label={label}
      />
    </label>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <span className={mediaLabel}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
              value === option.id ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed]' : 'border-slate-200 text-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-700">
      <span className={mediaLabel}>{label}</span>
      {children}
    </label>
  );
}
