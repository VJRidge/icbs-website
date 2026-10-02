import Footer from '../../components/Footer';
import { KitBlockView } from '../components/blog/blocks/brand/KitBlocks';
import type { BlogBlock } from '../lib/blog/blogBlockTypes';
import type { PublishedPageDocument } from '../types';

/** Landing pages built only from brand blocks: renders with the kit stylesheet, no studio CSS. */
export default function KitLandingView({ document }: { title: string; document: PublishedPageDocument }) {
  const blocks = (Array.isArray(document.blocks) ? document.blocks : []) as BlogBlock[];
  return (
    <main>
      {blocks.map((b) => (
        <KitBlockView key={b.id} block={b} />
      ))}
      <Footer />
    </main>
  );
}
