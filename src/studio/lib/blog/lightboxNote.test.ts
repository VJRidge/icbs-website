import { describe, expect, it } from 'vitest';
import {
  LIGHTBOX_WORD_MAX,
  clampLightboxBody,
  countLightboxWords,
  lightboxBodyForEdit,
  lightboxCopyStyle,
  lightboxHtml,
  lightboxParagraphsForDisplay,
} from './lightboxNote';

describe('lightboxNote', () => {
  it('counts words and clamps to 150', () => {
    expect(countLightboxWords('  one two  three ')).toBe(3);
    expect(countLightboxWords('')).toBe(0);
    expect(LIGHTBOX_WORD_MAX).toBe(150);
    const overflow = Array.from({ length: 170 }, (_, i) => `w${i}`).join(' ');
    expect(countLightboxWords(clampLightboxBody(overflow))).toBe(150);
  });

  it('joins stored paragraphs into one body for editing', () => {
    expect(lightboxBodyForEdit({ paragraphs: ['First.', 'Second.'] })).toBe('First.\n\nSecond.');
    expect(lightboxBodyForEdit({ body: 'Already written.' })).toBe('Already written.');
  });

  it('turns plain copy into paragraph HTML and counts words in tags', () => {
    expect(lightboxHtml({ body: 'Hello there.\n\nNext thought.' })).toBe(
      '<p>Hello there.</p><p>Next thought.</p>',
    );
    expect(countLightboxWords('<p>One two <strong>three</strong></p>')).toBe(3);
    expect(lightboxHtml({ body: '<p>Keep <span style="font-weight: 900">this</span> heavy.</p>' })).toContain(
      'font-weight: 900',
    );
  });

  it('maps text-module style fields onto the lightbox copy', () => {
    const style = lightboxCopyStyle({
      align: 'center',
      fontFamily: 'Georgia, serif',
      fontSize: '17',
      fontWeight: '500',
      textColor: '#214232',
      paragraphSpacing: 12,
    });
    expect(style.textAlign).toBe('center');
    expect(style.fontFamily).toBe('Georgia, serif');
    expect(style.fontSize).toBe('17px');
    expect(style.fontWeight).toBeUndefined();
    expect(style.color).toBe('#214232');
    expect((style as Record<string, string | undefined>)['--blog-p-spacing']).toBe('12px');
  });

  it('renders blank-line breaks as paragraphs', () => {
    expect(
      lightboxParagraphsForDisplay({
        body: 'Aim for clear language.\n\nReject the impressive-looking result.\n\nKeep your voice in the work.',
      }),
    ).toEqual([
      'Aim for clear language.',
      'Reject the impressive-looking result.',
      'Keep your voice in the work.',
    ]);
  });
});
