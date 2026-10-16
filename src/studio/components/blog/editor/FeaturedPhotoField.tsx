import { Image as ImageIcon } from 'lucide-react';
import FileUpload from '../../FileUpload';
import { useBlogAdminMediaLibrary } from '../../../contexts/BlogAdminMediaLibraryContext';
import { FEATURED_IMAGE_RATIO_LABEL, featuredImageFrameStyle } from '../../../lib/blog/featuredImage';

export default function FeaturedPhotoField({
  url,
  alt,
  noun,
  onUrl,
  onAlt,
}: {
  url: string;
  alt: string;
  noun: string;
  onUrl: (next: string) => void;
  onAlt: (next: string) => void;
}) {
  const { openMediaLibrary } = useBlogAdminMediaLibrary();
  const hasPhoto = Boolean(url.trim());

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[10px] leading-snug text-slate-500">
        Blog list, social previews, and the top of the published {noun} all crop this photo to{' '}
        <span className="font-semibold text-slate-600">{FEATURED_IMAGE_RATIO_LABEL}</span>. Click the photo to replace it from
        the media library.
      </p>
      <button
        type="button"
        className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left shadow-sm transition hover:border-brand-blue/40"
        onClick={() => openMediaLibrary((next) => onUrl(next), 'featured photo')}
        aria-label={hasPhoto ? 'Replace featured photo' : 'Choose featured photo'}
      >
        {hasPhoto ? (
          <img src={url} alt="" style={featuredImageFrameStyle()} />
        ) : (
          <span
            className="flex flex-col items-center justify-center gap-2 bg-slate-50 text-[11px] font-semibold text-slate-500"
            style={featuredImageFrameStyle()}
          >
            <ImageIcon size={22} className="text-slate-400" />
            Choose a {FEATURED_IMAGE_RATIO_LABEL} featured photo
          </span>
        )}
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-brand-blue/30 hover:text-brand-blue"
          onClick={() => openMediaLibrary((next) => onUrl(next), 'featured photo')}
        >
          {hasPhoto ? 'Replace from library' : 'Media library'}
        </button>
        {hasPhoto ? (
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-[#B53D0D]"
            onClick={() => onUrl('')}
          >
            Remove
          </button>
        ) : null}
      </div>
      <FileUpload
        variant="compact"
        bucket="media-public"
        label="Or upload a new file"
        type="image"
        accept="image/*"
        value={url}
        onChange={(next) => onUrl(next)}
      />
      <input
        value={alt}
        onChange={(event) => onAlt(event.target.value)}
        placeholder="Alt text…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-blue/40"
      />
    </div>
  );
}
