/** Accessibility contracts for builder widgets — keyboard + media text. */

export type BlockA11yRequirement = {
  type: string;
  requiresAltText: boolean;
  keyboardOperable: boolean;
  notes: string;
};

export const BLOCK_A11Y_CONTRACTS: readonly BlockA11yRequirement[] = [
  {
    type: 'paragraph',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'Rich text must keep semantic paragraphs and visible focus in the editor.',
  },
  {
    type: 'heading',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'Heading level must remain an actual heading element in public output.',
  },
  {
    type: 'image',
    requiresAltText: true,
    keyboardOperable: true,
    notes: 'Decorative images may use empty alt; informative images require non-empty alt.',
  },
  {
    type: 'columns',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'Column reorder/resize needs keyboard alternatives to drag handles.',
  },
  {
    type: 'video',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'Autoplay must be off by default; captions preferred when available.',
  },
  {
    type: 'button',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'Buttons and links must be reachable and activatable with keyboard.',
  },
  {
    type: 'gallery',
    requiresAltText: true,
    keyboardOperable: true,
    notes: 'Each gallery image with a URL needs non-empty alt text unless decorative.',
  },
  {
    type: 'carousel',
    requiresAltText: true,
    keyboardOperable: true,
    notes: 'Carousel slides need alt text; autoplay should be off by default with pause control.',
  },
  {
    type: 'contact_cta',
    requiresAltText: false,
    keyboardOperable: true,
    notes: 'CTA button label must describe the action when an email target is present.',
  },
];

export function a11yContractFor(type: string): BlockA11yRequirement | null {
  return BLOCK_A11Y_CONTRACTS.find((row) => row.type === type) ?? null;
}

export function missingAltTextIssues(
  blocks: Array<{ type: string; data?: Record<string, unknown> }>,
): Array<{ type: string; message: string }> {
  const issues: Array<{ type: string; message: string }> = [];
  for (const block of blocks) {
    const contract = a11yContractFor(block.type);
    if (!contract?.requiresAltText) continue;
    const alt = typeof block.data?.alt === 'string' ? block.data.alt.trim() : '';
    const url = typeof block.data?.url === 'string' ? block.data.url.trim() : '';
    if (url && !alt) {
      issues.push({ type: block.type, message: 'Image is missing alt text.' });
    }
  }
  return issues;
}
