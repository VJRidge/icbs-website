import FadeCarousel, { FadeSlide } from './FadeCarousel';
import type { FadeSlideData } from './fadeCarouselTypes';

function plate(label: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><text x="80" y="820" fill="rgba(247,247,242,0.35)" font-family="Georgia" font-size="64">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const SLIDES: FadeSlideData[] = [
  {
    image: plate('Receipts', '#072a1b', '#1c6b48'),
    imageAlt: 'Deep green field fading into forest',
    eyebrow: 'Featured',
    title: 'Keep the receipts.',
    subtitle: 'Calm slides. No sideways noise.',
    body: 'A hero that sits still and crossfades — for arguments that deserve a full breath.',
    primaryCta: { label: 'Read the kit', href: '/kit' },
    secondaryCta: { label: 'Browse posts', href: '/blog', variant: 'secondary' },
  },
  {
    image: plate('Process', '#151412', '#b53d0d'),
    imageAlt: 'Warm charcoal shifting into orange',
    eyebrow: 'Method',
    title: 'Trust the process.',
    body: 'Autoplay pauses when you hover, tab in, or leave the page. The next image is already waiting.',
    primaryCta: { label: 'See the work', href: '/projects' },
  },
  {
    image: plate('Club', '#1a5340', '#fdc20f'),
    imageAlt: 'Forest green lifting into gold',
    eyebrow: 'Community',
    title: 'HBCU Club House.',
    body: 'Overlay, type, and CTAs stay above 4.5:1 on the dimmed plate.',
    primaryCta: { label: 'Join', href: '/club' },
  },
];

/** (a) Full-bleed image, overlay copy, dual CTA */
export function FadeVariantBleed() {
  return (
    <FadeCarousel
      variant="bleed"
      slides={SLIDES}
      height="80vh"
      align="bottom-left"
      overlayGradient="bottom"
      overlayColor="#072a1b"
      overlayOpacity={0.68}
      autoplay
      autoplayInterval={6}
      showCounter
      dotsShape="line"
      ariaLabel="Featured stories"
    />
  );
}

/** (b) Split: image left, text right */
export function FadeVariantSplit() {
  return (
    <FadeCarousel
      variant="split"
      slides={SLIDES}
      height={520}
      align="center-left"
      overlayGradient="none"
      autoplay={false}
      arrowsPosition="outside"
      dotsShape="dot"
      showCounter
      ariaLabel="Project features"
    />
  );
}

/** (c) Centered card over a quiet page ground */
export function FadeVariantCard() {
  return (
    <FadeCarousel ariaLabel="Featured card slides" variant="card" height={560} align="bottom-left" overlayGradient="radial" dotsShape="square">
      {SLIDES.map((slide) => (
        <FadeSlide key={slide.title} {...slide} />
      ))}
    </FadeCarousel>
  );
}
