import { hasSurfaceOverlay, hasSurfaceVideo, surfaceMediaFilter, type SurfaceBackground } from '../../lib/blog/surfaceBackground';

export default function SurfaceBackgroundLayers({ bg }: { bg: SurfaceBackground }) {
  const filter = surfaceMediaFilter(bg);
  const video = hasSurfaceVideo(bg);
  const overlay = hasSurfaceOverlay(bg);
  if (!video && !overlay && !filter) return null;

  return (
    <>
      {video ? (
        <video
          className="vj-surface-media"
          src={bg.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          style={filter ? { filter } : undefined}
        />
      ) : bg.type === 'image' && bg.imageUrl && filter ? (
        <span
          className="vj-surface-media"
          style={{
            backgroundImage: `url("${bg.imageUrl.replace(/"/g, '')}")`,
            backgroundSize: bg.imageSize,
            backgroundPosition: bg.imagePosition,
            filter,
          }}
        />
      ) : null}
      {overlay ? (
        <span
          className="vj-surface-overlay"
          style={{
            backgroundColor: bg.overlayColor,
            opacity: bg.overlayOpacity / 100,
            mixBlendMode: bg.blendMode as never,
          }}
        />
      ) : null}
    </>
  );
}
