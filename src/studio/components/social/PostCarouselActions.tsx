import { Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBlogEditorStore } from '../../lib/blog/useBlogEditorStore';
import { buildCarouselArticleFromPost, saveCarouselFromPost } from '../../lib/social/carouselFromBlog';

type PostCarouselActionsProps = {
  title: string;
  excerpt: string;
  body: string;
  contentMode: 'html' | 'blocks';
  slug: string;
  postId: string | null;
  featuredImageUrl: string;
};

/** Hands a post to the slide editor. It does not change the post. */
export default function PostCarouselActions({
  title,
  excerpt,
  body,
  contentMode,
  slug,
  postId,
  featuredImageUrl,
}: PostCarouselActionsProps) {
  const navigate = useNavigate();

  const open = (autoGenerate: boolean) => {
    const articleText = buildCarouselArticleFromPost({
      title,
      excerpt,
      body,
      contentMode,
      blocks: useBlogEditorStore.getState().blocks,
      slug,
    });
    if (articleText.trim().length < 40) {
      window.alert('Add a title and a bit more of the post before making slides.');
      return;
    }
    saveCarouselFromPost({
      articleText,
      sourceLabel: title.trim() || 'Blog post',
      returnTo: postId ? `/admin/posts/${postId}` : '/admin/posts',
      postId,
      autoGenerate,
      featuredImageUrl: featuredImageUrl.trim() || null,
    });
    navigate('/admin/social/carousel?fromPost=1');
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Social slides</p>
      <button
        type="button"
        onClick={() => open(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white"
      >
        <Images size={13} /> Generate slides
      </button>
      <button
        type="button"
        onClick={() => open(false)}
        className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600"
      >
        Open slide editor
      </button>
    </div>
  );
}
