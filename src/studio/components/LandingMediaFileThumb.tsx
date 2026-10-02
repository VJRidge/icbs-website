import { useCallback, useRef } from 'react';
import { FileText, Music, Play } from 'lucide-react';
import {
  isProbablyAudio,
  isProbablyGif,
  isProbablyRasterImage,
  isProbablyVideo,
  isProbablyDoc,
} from '../lib/landingMediaLibrary';

type Props = {
  name: string;
  publicUrl: string;
  onPreviewVideo?: () => void;
};

/** Grid thumbnail for landing-media picker and CMS media list. */
export default function LandingMediaFileThumb({ name, publicUrl, onPreviewVideo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekVideoPoster = useCallback(() => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    try {
      el.currentTime = Math.min(0.5, Math.max(0, el.duration * 0.05));
    } catch {
      /* some codecs reject seek before buffer */
    }
  }, []);

  if (isProbablyRasterImage(name) || isProbablyGif(name)) {
    return (
      <img
        src={publicUrl}
        alt=""
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (isProbablyVideo(name)) {
    return (
      <div className="relative h-full w-full bg-slate-900">
        <video
          ref={videoRef}
          src={publicUrl}
          preload="metadata"
          muted
          playsInline
          className="h-full w-full object-cover"
          onLoadedMetadata={seekVideoPoster}
        />
        {onPreviewVideo ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewVideo();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 text-white opacity-90 transition hover:bg-black/50"
            aria-label="Preview video"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider">Preview</span>
          </button>
        ) : null}
      </div>
    );
  }

  if (isProbablyAudio(name)) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
        <Music className="h-6 w-6 text-brand-blue" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Audio</span>
      </span>
    );
  }

  if (isProbablyDoc(name)) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
        <FileText className="h-6 w-6 text-slate-500" />
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">Document</span>
      </span>
    );
  }

  return (
    <span className="px-2 text-center text-[10px] font-bold text-slate-500 break-all">{name}</span>
  );
}
