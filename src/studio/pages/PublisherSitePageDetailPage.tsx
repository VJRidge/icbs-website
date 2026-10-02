import { coerceBlogHtmlForRendering, manuscriptLooksLikeHtml } from '../lib/opEdManuscript';
import { parseBlogBlocks } from '../lib/blog/useBlogEditorStore';
import BlogBlockRenderer from '../components/blog/BlogBlockRenderer';
import BlogArticleHtmlDisplay from '../components/blog/BlogArticleHtmlDisplay';
import { KitBlockView } from '../components/blog/blocks/brand/KitBlocks';
import { isKitBlockType, type BlogBlock } from '../lib/blog/blogBlockTypes';
import Footer from '../../components/Footer';
import SiteHeader from '../../components/SiteHeader';
import type { PublishedPageDocument } from '../types';
import '../studio-public.css';

export type PostMeta = {
  author?: string;
  publishedAt?: string | null;
  categories?: { slug: string; name: string }[];
};

type Props = {
  title: string;
  document: PublishedPageDocument;
  post?: PostMeta;
};

function formatPostDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const PROSE_CLASSES = [
  'op-ed-body prose prose-slate max-w-none prose-headings:font-black prose-h2:text-2xl prose-h3:text-xl',
  'prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-slate-700 prose-li:text-slate-700',
  'prose-a:text-brand-blue prose-a:font-semibold prose-a:no-underline hover:prose-a:underline',
  'prose-blockquote:border-l-brand-blue prose-blockquote:text-slate-600',
  'prose-img:rounded-xl prose-img:shadow-md prose-img:my-8',
  '[&_video]:rounded-xl [&_video]:shadow-md [&_video]:my-8',
  '[&_iframe]:max-w-full [&_iframe]:rounded-xl [&_iframe]:border [&_iframe]:border-slate-200 [&_iframe]:my-8',
].join(' ');

/** Kit blocks run edge to edge; runs of regular blocks sit in a centered cream column between them. */
function LandingLayout({ blocks }: { blocks: BlogBlock[] }) {
  const groups: { kit: boolean; blocks: BlogBlock[] }[] = [];
  for (const b of blocks) {
    const kit = isKitBlockType(b.type);
    const last = groups[groups.length - 1];
    if (last && !kit && !last.kit) last.blocks.push(b);
    else groups.push({ kit, blocks: [b] });
  }
  return (
    <main>
      {groups.map((g) =>
        g.kit ? (
          <KitBlockView key={g.blocks[0].id} block={g.blocks[0]} />
        ) : (
          <section key={g.blocks[0].id} className="sec cream">
            <div className="wrap">
              <div className={`studio-public mx-auto max-w-3xl ${PROSE_CLASSES}`}>
                <div className="not-prose space-y-8">
                  {g.blocks.map((b) => (
                    <BlogBlockRenderer key={b.id} block={b} isEditing={false} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ),
      )}
      <Footer />
    </main>
  );
}

/** Public render of a published studio page (`contents.published_document`). */
export default function PublisherSitePageDetailPage({ title, document, post }: Props) {
  const postDate = formatPostDate(post?.publishedAt);
  const img = document.featured_image_url?.trim();
  const html = document.html || '';
  const bodyIsHtml = manuscriptLooksLikeHtml(coerceBlogHtmlForRendering(html));
  const blockList = parseBlogBlocks(document.blocks);
  const useBlockLayout = blockList.length > 0;

  if (document.layout === 'landing' && useBlockLayout) return <LandingLayout blocks={blockList} />;

  return (
    <>
      <SiteHeader />
      <div className="studio-public min-h-screen bg-[#f4f6f9] px-4 pb-16 pt-10 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <header className="flex flex-col gap-6 border-b border-slate-200 pb-8">
            <div className="min-w-0">
              <a
                href={post ? '/blog' : '/'}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue hover:underline"
              >
                {post ? '← I Call BS blog' : 'I Call BS'}
              </a>
              <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
              {post ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-600">
                  {post.author ? (
                    <span>
                      By <a href="/about" className="font-semibold text-brand-blue hover:underline">{post.author}</a>
                    </span>
                  ) : null}
                  {post.author && postDate ? <span aria-hidden>·</span> : null}
                  {postDate ? <time dateTime={post.publishedAt ?? undefined}>{postDate}</time> : null}
                  {post.categories?.map((c) => (
                    <a
                      key={c.slug}
                      href={`/blog?category=${encodeURIComponent(c.slug)}`}
                      className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-blue hover:bg-brand-blue/20"
                    >
                      {c.name}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            {img ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                <img
                  src={img}
                  alt={document.featured_image_alt?.trim() || title}
                  className="max-h-[380px] w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
          </header>

          <div className={`${PROSE_CLASSES} py-10`}>
            {useBlockLayout ? (
              <div className="not-prose space-y-8">
                {blockList.map((b) => (
                  <BlogBlockRenderer key={b.id} block={b} isEditing={false} />
                ))}
              </div>
            ) : bodyIsHtml ? (
              <BlogArticleHtmlDisplay html={html} />
            ) : (
              <div className="whitespace-pre-wrap text-[17px] leading-[1.75] text-slate-700">{html}</div>
            )}
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
