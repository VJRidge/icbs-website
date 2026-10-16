import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EDITOR_FONT_FAMILY_OPTIONS } from './editorFontChoices';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const SHIPPED = ['Anton', 'Newsreader', 'IBM Plex Mono'] as const;
const DROPPED = ['Inter', 'Lato', 'Playfair'] as const;

describe('editor font presets', () => {
  it('offers the self-hosted brand families and not Inter/Lato/Playfair', () => {
    const labels = EDITOR_FONT_FAMILY_OPTIONS.map((o) => o.label);
    for (const name of SHIPPED) {
      expect(labels).toContain(name);
    }
    for (const name of DROPPED) {
      expect(labels.some((l) => l.includes(name))).toBe(false);
    }
  });
});

describe('self-hosted woff2 files', () => {
  const files = [
    'Anton-Regular.woff2',
    'Newsreader-Regular.woff2',
    'Newsreader-Bold.woff2',
    'IBMPlexMono-Regular.woff2',
    'IBMPlexMono-Bold.woff2',
  ];

  it.each(files)('ships %s', (name) => {
    expect(existsSync(resolve(repoRoot, 'public/fonts', name))).toBe(true);
  });
});

describe('no Google Fonts CDN', () => {
  it('does not load fonts.googleapis.com or fonts.gstatic.com from index or kit/brand CSS', () => {
    const paths = ['index.html', 'src/styles.css', 'src/brand/brand.css', 'src/selfHostedFonts.css'];
    const blob = paths
      .filter((p) => existsSync(resolve(repoRoot, p)))
      .map((p) => readFileSync(resolve(repoRoot, p), 'utf8'))
      .join('\n');
    expect(blob).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('declares @font-face for Anton, Newsreader, and IBM Plex Mono', () => {
    const css = readFileSync(resolve(repoRoot, 'src/selfHostedFonts.css'), 'utf8');
    expect(css).toMatch(/font-family:\s*Newsreader/);
    expect(css).toMatch(/font-family:\s*Anton/);
    expect(css).toMatch(/font-family:\s*['"]IBM Plex Mono['"]/);
    expect(css).toMatch(/url\("\/fonts\/Newsreader-Regular\.woff2"\)/);
    expect(css).toMatch(/url\("\/fonts\/Anton-Regular\.woff2"\)/);
    expect(css).toMatch(/url\("\/fonts\/IBMPlexMono-Regular\.woff2"\)/);
  });
});
