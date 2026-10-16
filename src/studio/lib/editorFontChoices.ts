/** Preset families (stacks omit extra quotes so they round-trip TipTap/HTML `font-family` parsing). */
export const EDITOR_FONT_FAMILY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: 'Anton', value: 'Anton, Impact, sans-serif' },
  { label: 'Newsreader', value: 'Newsreader, Georgia, serif' },
  { label: 'IBM Plex Mono', value: 'IBM Plex Mono, ui-monospace, monospace' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
];

export const EDITOR_FONT_WEIGHT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: '300 Light', value: '300' },
  { label: '400 Normal', value: '400' },
  { label: '500 Medium', value: '500' },
  { label: '600 Semibold', value: '600' },
  { label: '700 Bold', value: '700' },
  { label: '800 Extra bold', value: '800' },
  { label: '900 Black', value: '900' },
];

export const EDITOR_FONT_SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: '12 px', value: '12px' },
  { label: '14 px', value: '14px' },
  { label: '16 px', value: '16px' },
  { label: '17 px', value: '17px' },
  { label: '18 px', value: '18px' },
  { label: '20 px', value: '20px' },
  { label: '24 px', value: '24px' },
  { label: '28 px', value: '28px' },
  { label: '36 px', value: '36px' },
  /** Legacy event-description sizes (rem) — kept so older HTML still maps in the toolbar. */
  { label: 'Small', value: '0.875rem' },
  { label: 'Large', value: '1.125rem' },
  { label: 'XL', value: '1.375rem' },
  { label: '2XL', value: '1.75rem' },
];
