/** Preset families (stacks omit extra quotes so they round-trip TipTap/HTML `font-family` parsing). */
export const EDITOR_FONT_FAMILY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Playfair', value: 'Playfair Display, Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
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
