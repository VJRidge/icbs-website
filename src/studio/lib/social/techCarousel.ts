export type TechTemplateId = 'story' | 'myth' | 'tool' | 'book' | 'howto';

export type CarouselSlide = {
  id: string;
  kicker: string;
  headline: string;
  body: string;
};

export const TECH_TEMPLATES: { id: TechTemplateId; label: string; hint: string }[] = [
  { id: 'story', label: 'The point', hint: 'One idea from the post, then the link.' },
  { id: 'myth', label: 'Myth and correction', hint: 'The claim people repeat, then what is actually true.' },
  { id: 'tool', label: 'A tool I tried', hint: 'What it is, what happened, and whether to keep it.' },
  { id: 'book', label: 'A step from the book', hint: 'One step, what to watch for, then a turn to try.' },
  { id: 'howto', label: 'A short how-to', hint: 'A few steps, then the full post.' },
];

const KICKERS: Record<TechTemplateId, string[]> = {
  story: ['The point', 'Keep going', 'One more thing', 'Read the post'],
  myth: ['The myth', 'The correction', 'Why it sticks', 'Try this'],
  tool: ['The tool', 'What I tried', 'What happened', 'Keep or skip'],
  book: ['From the book', 'The step', 'Watch for this', 'Your turn'],
  howto: ['How to', 'Step 1', 'Step 2', 'Step 3'],
};

function chunksFromArticle(articleText: string): { title: string; bits: string[]; readMore: string } {
  const blocks = articleText
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const read = blocks.find((part) => /^read more:/i.test(part)) ?? '';
  const rest = blocks.filter((part) => part !== read);
  const title = rest[0] ?? 'Untitled';
  const bits = rest.slice(1).flatMap((part) => {
    if (part.length <= 180) return [part];
    return part
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 20);
  });
  return { title, bits, readMore: read.replace(/^read more:\s*/i, '') };
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function buildTechSlides(articleText: string, template: TechTemplateId): CarouselSlide[] {
  const { title, bits, readMore } = chunksFromArticle(articleText);
  const kickers = KICKERS[template];
  const slides: CarouselSlide[] = kickers.map((kicker, index) => {
    const source = bits[index] ?? '';
    const headline = index === 0 ? title : source || `Add the ${kicker.toLowerCase()} line`;
    const body = source || (index === 0 ? bits[0] || '' : '');
    return {
      id: `slide-${index + 1}`,
      kicker,
      headline: clip(headline, 72),
      body: clip(body, 220),
    };
  });
  if (readMore) {
    slides.push({
      id: 'slide-link',
      kicker: 'Read the post',
      headline: clip(title, 72),
      body: readMore,
    });
  }
  return slides;
}

export function slidesCaption(slides: CarouselSlide[]): string {
  return slides
    .map((slide, index) => `${index + 1}. ${slide.kicker}: ${slide.headline}`)
    .join('\n');
}
