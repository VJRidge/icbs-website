import { cn } from '../../lib/utils';
import {
  EDITOR_BRAND_SWATCHES,
  normalizeHexColor,
} from '../../lib/editor/brandColorPresets';

type EditorColorSwatchPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  /** Run before applying a color (e.g. snapshot TipTap selection). */
  onBeforeChange?: () => void;
  swatches?: readonly string[];
  showCustomPicker?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

/** Swatch grid + optional native color input — shared across editors. */
export default function EditorColorSwatchPicker({
  value,
  onChange,
  onBeforeChange,
  swatches = EDITOR_BRAND_SWATCHES,
  showCustomPicker = true,
  size = 'md',
  className,
}: EditorColorSwatchPickerProps) {
  const pick = (hex: string) => {
    onBeforeChange?.();
    onChange(hex);
  };
  const normalized = normalizeHexColor(value);
  const btnClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {swatches.map((hex) => {
        const active = hexColorsEqual(hex, normalized);
        return (
          <button
            key={hex}
            type="button"
            title={hex}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(hex)}
            className={cn(
              btnClass,
              'rounded-md border-2 transition hover:scale-105',
              active ? 'border-brand-blue ring-2 ring-brand-blue/30' : 'border-slate-200',
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
      {showCustomPicker ? (
        <label
          data-toolbar-popover
          className={cn(
            btnClass,
            'relative flex cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-[8px] font-bold text-slate-500 hover:border-brand-blue/40',
          )}
          title="Custom color"
          onMouseDown={() => onBeforeChange?.()}
        >
          +
          <input
            type="color"
            value={normalized}
            onMouseDown={() => onBeforeChange?.()}
            onInput={(e) => pick(e.currentTarget.value)}
            onChange={(e) => pick(e.currentTarget.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      ) : null}
    </div>
  );
}

type EditorColorFieldProps = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

/** Compact labeled native color input (carousel theme row). */
export function EditorColorField({ label, value, onChange }: EditorColorFieldProps) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-0.5" title={label}>
      <span className="text-[9px] font-semibold uppercase text-slate-400">{label}</span>
      <input
        type="color"
        value={normalizeHexColor(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-slate-300 bg-transparent p-0.5"
      />
    </label>
  );
}

function hexColorsEqual(a: string, b: string): boolean {
  return normalizeHexColor(a).toLowerCase() === normalizeHexColor(b).toLowerCase();
}
