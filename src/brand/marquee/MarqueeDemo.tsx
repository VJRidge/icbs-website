import Marquee, { MarqueeRow } from './Marquee';
import type { MarqueeItem } from './marqueeTypes';

function mark(label: string, fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="44" viewBox="0 0 168 44"><rect width="168" height="44" rx="8" fill="${fill}"/><text x="84" y="28" text-anchor="middle" fill="#f7f7f2" font-family="IBM Plex Mono, monospace" font-size="12" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const DEMO_ITEMS: MarqueeItem[] = [
  { image: mark('CULTURETECH', '#072a1b'), alt: 'CultureTech', href: 'https://culturetech.io' },
  { image: mark('VETTAJIMALE', '#1c6b48'), alt: 'VettaJimale.Tech' },
  { image: mark('HBCU CLUB', '#b53d0d'), alt: 'HBCU Club House' },
  { image: mark('I CALL BS', '#151412'), alt: 'I Call BS' },
  { image: mark('KIT', '#1a5340'), alt: 'Starter Kit' },
];

/** (a) Tight single-row logo strip */
export function MarqueeVariantStrip() {
  return (
    <Marquee
      eyebrow="Trusted by"
      heading="Teams that keep the receipts"
      items={DEMO_ITEMS}
      rows={1}
      gap={36}
      itemMaxHeight={36}
      tint="grayscale"
      colorizeOnHover
      showEdgeFade
      pauseOnHover
      background="#ffffff"
      edgeFadeColor="#ffffff"
      padding={{ top: 28, bottom: 28 }}
      borderTop="1px solid #d4d8d3"
      borderBottom="1px solid #d4d8d3"
    />
  );
}

/** (b) Two-row with opposing directions */
export function MarqueeVariantOpposing() {
  return (
    <Marquee
      eyebrow="Current projects"
      heading="The work moving in both directions"
      items={DEMO_ITEMS}
      rows={2}
      directions={['left', 'right']}
      speeds={[40, 28]}
      gap="2rem"
      itemMaxHeight={40}
      tint="none"
      background="#f7f7f2"
      stripBackground="#f7f7f2"
      edgeFadeColor="#f7f7f2"
      padding={{ top: 32, bottom: 32 }}
    />
  );
}

/** (c) Chip-style pills — compose rows yourself */
export function MarqueeVariantChips() {
  return (
    <Marquee
      eyebrow="Partners"
      heading="Logos as quiet receipts"
      background="#ffffff"
      padding={{ top: 32, bottom: 36 }}
      ariaLabel="Partner logos"
    >
      <MarqueeRow
        items={DEMO_ITEMS}
        variant="chip"
        direction="left"
        speed={38}
        gap={14}
        itemMaxHeight={28}
        tint="none"
        stripBackground="#ffffff"
        edgeFadeColor="#ffffff"
        rowPaddingY={10}
      />
    </Marquee>
  );
}
