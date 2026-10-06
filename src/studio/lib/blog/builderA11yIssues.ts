import { normalizeBlocks, countInvalidBlocks, type NormalizedBlogBlock } from './blockSchemas';
import { normalizeColumnZones } from './columnLayouts';

export type BuilderA11yIssue = {
  severity: 'error' | 'warning';
  code: 'missing_alt' | 'invalid_block' | 'autoplay' | 'empty_label' | 'empty_link' | 'heading_skip';
  message: string;
  blockId?: string;
  blockType?: string;
};

type FlatBlock = { id?: string; type: string; data?: Record<string, unknown> };

function flattenBlocks(blocks: FlatBlock[]): FlatBlock[] {
  const out: FlatBlock[] = [];
  for (const block of blocks) {
    out.push(block);
    if (block.type === 'columns') {
      const layout = String(block.data?.layout ?? '50-50');
      const zones = normalizeColumnZones(block.data?.columns, layout);
      for (const zone of zones) {
        out.push(...flattenBlocks(zone.blocks as FlatBlock[]));
      }
    }
  }
  return out;
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function collectGalleryAltIssues(block: FlatBlock): BuilderA11yIssue[] {
  const images = Array.isArray(block.data?.images) ? block.data!.images : [];
  const issues: BuilderA11yIssue[] = [];
  images.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const img = raw as { url?: unknown; alt?: unknown };
    const url = textOf(img.url);
    const alt = textOf(img.alt);
    if (url && !alt) {
      issues.push({
        severity: 'error',
        code: 'missing_alt',
        message: `Gallery image ${index + 1} is missing alt text.`,
        blockId: block.id,
        blockType: 'gallery',
      });
    }
  });
  return issues;
}

function collectCarouselAltIssues(block: FlatBlock): BuilderA11yIssue[] {
  const items = Array.isArray(block.data?.items) ? block.data!.items : [];
  const issues: BuilderA11yIssue[] = [];
  items.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const item = raw as { url?: unknown; alt?: unknown; videoUrl?: unknown };
    const url = textOf(item.url);
    const alt = textOf(item.alt);
    if (url && !alt) {
      issues.push({
        severity: 'error',
        code: 'missing_alt',
        message: `Carousel slide ${index + 1} is missing alt text.`,
        blockId: block.id,
        blockType: 'carousel',
      });
    }
  });
  return issues;
}

export function collectBuilderA11yIssues(rawBlocks: unknown): BuilderA11yIssue[] {
  const normalized = normalizeBlocks(rawBlocks);
  const flat = flattenBlocks(
    normalized.map((b) => ({ id: b.id, type: b.type, data: b.data })),
  );
  const issues: BuilderA11yIssue[] = [];

  for (const block of normalized) {
    if (block.invalid) {
      issues.push({
        severity: 'error',
        code: 'invalid_block',
        message: `Block “${block.type}” has invalid data and may not render correctly.`,
        blockId: block.id,
        blockType: block.type,
      });
    }
  }

  for (const block of flat) {
    if (block.type === 'image') {
      const alt = textOf(block.data?.alt);
      const url = textOf(block.data?.url);
      if (url && !alt) {
        issues.push({
          severity: 'error',
          code: 'missing_alt',
          message: 'Image is missing alt text.',
          blockId: block.id,
          blockType: 'image',
        });
      }
    }
    if (block.type === 'gallery') issues.push(...collectGalleryAltIssues(block));
    if (block.type === 'carousel') issues.push(...collectCarouselAltIssues(block));
  }

  let lastHeadingLevel: number | null = null;
  for (const block of flat) {
    if (block.type === 'heading') {
      const level = Number(block.data?.level ?? 2);
      if (Number.isFinite(level) && level >= 1 && level <= 6) {
        if (lastHeadingLevel != null && level > lastHeadingLevel + 1) {
          issues.push({
            severity: 'warning',
            code: 'heading_skip',
            message: `Heading level jumps from h${lastHeadingLevel} to h${level}. Prefer stepping one level at a time.`,
            blockId: block.id,
            blockType: 'heading',
          });
        }
        lastHeadingLevel = level;
      }
    }

    if (block.type === 'button') {
      const label = textOf(block.data?.text);
      const url = textOf(block.data?.url);
      if (!label) {
        issues.push({
          severity: 'error',
          code: 'empty_label',
          message: 'Button has no accessible label text.',
          blockId: block.id,
          blockType: 'button',
        });
      }
      if (label && !url) {
        issues.push({
          severity: 'error',
          code: 'empty_link',
          message: 'Button has a label but no destination URL.',
          blockId: block.id,
          blockType: 'button',
        });
      }
    }

    if (block.type === 'contact_cta') {
      const label = textOf(block.data?.buttonLabel);
      const email = textOf(block.data?.email);
      if (email && !label) {
        issues.push({
          severity: 'error',
          code: 'empty_label',
          message: 'Contact CTA button label is empty.',
          blockId: block.id,
          blockType: 'contact_cta',
        });
      }
    }

    if (block.type === 'video' && block.data?.autoplay === true) {
      issues.push({
        severity: 'warning',
        code: 'autoplay',
        message: 'Video autoplay is on. Prefer off by default for accessibility.',
        blockId: block.id,
        blockType: 'video',
      });
    }

    if (block.type === 'carousel' && block.data?.autoplay === true) {
      issues.push({
        severity: 'warning',
        code: 'autoplay',
        message: 'Carousel autoplay is on. Prefer paused-by-default and pause-on-hover.',
        blockId: block.id,
        blockType: 'carousel',
      });
    }
  }

  return issues;
}

export function builderA11ySummary(issues: BuilderA11yIssue[]): {
  errors: number;
  warnings: number;
  invalidBlocks: number;
} {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    invalidBlocks: countInvalidBlocks(
      issues
        .filter((i) => i.code === 'invalid_block')
        .map(
          (i): NormalizedBlogBlock => ({
            id: i.blockId || 'x',
            type: i.blockType || 'paragraph',
            data: {},
            schemaVersion: 1,
            invalid: true,
          }),
        ),
    ),
  };
}
