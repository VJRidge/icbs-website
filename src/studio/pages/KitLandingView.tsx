import { useEffect } from 'react';
import Footer from '../../components/Footer';
import SiteHeader from '../../components/SiteHeader';
import { KitBlockView } from '../components/blog/blocks/brand/KitBlocks';
import type { BlogBlock } from '../lib/blog/blogBlockTypes';
import type { PublishedPageDocument } from '../types';

/** Landing pages built only from brand blocks: renders with the kit stylesheet, no studio CSS. */
export default function KitLandingView({
  document,
  chrome = false,
}: {
  title: string;
  document: PublishedPageDocument;
  chrome?: boolean;
}) {
  const blocks = (Array.isArray(document.blocks) ? document.blocks : []) as BlogBlock[];

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const go = () => window.document.getElementById(id)?.scrollIntoView();
    go();
    const timers = [80, 400, 900].map((ms) => window.setTimeout(go, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [document]);

  return (
    <main>
      {chrome ? <SiteHeader /> : null}
      {blocks.map((b) => (
        <KitBlockView key={b.id} block={b} />
      ))}
      <Footer />
    </main>
  );
}
