import { coerceBlogHtmlForRendering, manuscriptLooksLikeHtml } from '../lib/opEdManuscript';
import { parseBlogBlocks } from '../lib/blog/useBlogEditorStore';
import BlogBlockRenderer from '../components/blog/BlogBlockRenderer';
import BlogArticleHtmlDisplay from '../components/blog/BlogArticleHtmlDisplay';
import Footer from '../../components/Footer';
import type { PublishedPageDocument } from '../types';
import '../studio-public.css';

type Props = {
  title: string;
  document: PublishedPageDocument;
};

/** Public render of a published studio page (`contents.published_document`). */
export default function PublisherSitePageDetailPage({ title, document }: Props) {
  const img = document.featured_image_url?.trim();
  const html = document.html || '';
  const bodyIsHtml = manuscriptLooksLikeHtml(coerceBlogHtmlForRendering(html));
  const blockList = parseBlogBlocks(document.blocks);
  const useBlockLayout = blockList.length > 0;

  return (
    <>
      <div className="studio-public min-h-screen bg-[#f4f6f9] px-4 pb-16 pt-10 sm:px-6">
        <article className="mx-auto max-w-3xl">
          <header className="flex flex-col gap-6 border-b border-slate-200 pb-8">
            <div className="min-w-0">
              <a href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-blue hover:underline">
                I Call BS
              </a>
              <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
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

          <div
            className={[
              'op-ed-body prose prose-slate max-w-none py-10 prose-headings:font-black prose-h2:text-2xl prose-h3:text-xl',
              'prose-p:text-[17px] prose-p:leading-[1.75] prose-p:text-slate-700 prose-li:text-slate-700',
              'prose-a:text-brand-blue prose-a:font-semibold prose-a:no-underline hover:prose-a:underline',
              'prose-blockquote:border-l-brand-blue prose-blockquote:text-slate-600',
              'prose-img:rounded-xl prose-img:shadow-md prose-img:my-8',
              '[&_video]:rounded-xl [&_video]:shadow-md [&_video]:my-8',
              '[&_iframe]:max-w-full [&_iframe]:rounded-xl [&_iframe]:border [&_iframe]:border-slate-200 [&_iframe]:my-8',
            ].join(' ')}
          >
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
