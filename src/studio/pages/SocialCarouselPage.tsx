import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Download } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import type { UserProfile } from '../types';
import { clearCarouselFromPost, loadCarouselFromPost } from '../lib/social/carouselFromBlog';
import { downloadSlide } from '../lib/social/paintSlide';
import {
  TECH_TEMPLATES,
  buildTechSlides,
  slidesCaption,
  type CarouselSlide,
  type TechTemplateId,
} from '../lib/social/techCarousel';

type SocialCarouselPageProps = { userProfile: UserProfile };

export default function SocialCarouselPage({ userProfile }: SocialCarouselPageProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [article, setArticle] = useState('');
  const [label, setLabel] = useState('Untitled post');
  const [backTo, setBackTo] = useState('/admin/posts');
  const [template, setTemplate] = useState<TechTemplateId>('story');
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [selected, setSelected] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (params.get('fromPost') !== '1') return;
    const payload = loadCarouselFromPost();
    clearCarouselFromPost();
    if (!payload) return;
    setArticle(payload.articleText);
    setLabel(payload.sourceLabel);
    setBackTo(payload.returnTo || '/admin/posts');
    if (!payload.autoGenerate) return;
    const next = buildTechSlides(payload.articleText, 'story');
    setSlides(next);
    setSelected(0);
  }, [params]);

  const current = slides[selected] ?? null;
  const caption = useMemo(() => slidesCaption(slides), [slides]);

  const rebuild = (nextTemplate: TechTemplateId) => {
    if (article.trim().length < 40) {
      setNote('Paste a post, or open this from a post that already has a title and some body.');
      return;
    }
    setTemplate(nextTemplate);
    setSlides(buildTechSlides(article, nextTemplate));
    setSelected(0);
    setNote('');
  };

  const updateCurrent = (patch: Partial<CarouselSlide>) => {
    setSlides((list) => list.map((slide, index) => (index === selected ? { ...slide, ...patch } : slide)));
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setNote('Caption copied. Post the images yourself.');
    } catch {
      setNote('Could not copy. Select the caption and copy it manually.');
    }
  };

  return (
    <AdminCmsShell title="Social slides" backTo={backTo} backLabel="Back to post" userProfile={userProfile}>
      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shape</p>
          {TECH_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => rebuild(item.id)}
              className={`block w-full rounded-lg border px-3 py-2 text-left ${
                template === item.id ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="block text-xs font-bold text-slate-900">{item.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{item.hint}</span>
            </button>
          ))}
        </aside>
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              <ArrowLeft size={12} /> {label}
            </button>
            <button
              type="button"
              disabled={!current}
              onClick={() => current && downloadSlide(current, selected, slides.length)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40"
            >
              <Download size={12} /> Download this slide
            </button>
          </div>
          {slides.length === 0 ? (
            <label className="block rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              Paste a post here, then pick a shape.
              <textarea
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                rows={8}
                className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm"
              />
            </label>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`w-56 shrink-0 rounded-xl p-4 text-left ${
                    index === selected ? 'ring-2 ring-[#F3D13D]' : ''
                  }`}
                  style={{ background: '#1A5340', color: '#F7F7F2', minHeight: 280 }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#F3D13D]">{slide.kicker}</span>
                  <span className="mt-3 block font-serif text-xl leading-tight">{slide.headline}</span>
                  <span className="mt-3 block text-xs leading-snug opacity-90">{slide.body}</span>
                </button>
              ))}
            </div>
          )}
          {note ? <p className="mt-3 text-xs text-slate-600">{note}</p> : null}
        </section>
        <aside className="space-y-3">
          {current ? (
            <>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Kicker
                <input
                  value={current.kicker}
                  onChange={(e) => updateCurrent({ kicker: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Headline
                <textarea
                  value={current.headline}
                  onChange={(e) => updateCurrent({ headline: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Body
                <textarea
                  value={current.body}
                  onChange={(e) => updateCurrent({ body: e.target.value })}
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            </>
          ) : (
            <p className="text-sm text-slate-500">Slides you download stay on this computer. Nothing is posted to a social account.</p>
          )}
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Caption
            <textarea readOnly value={caption} rows={6} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
          </label>
          <button
            type="button"
            disabled={!caption}
            onClick={() => void copyCaption()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 disabled:opacity-40"
          >
            <Copy size={12} /> Copy caption
          </button>
        </aside>
      </div>
    </AdminCmsShell>
  );
}
