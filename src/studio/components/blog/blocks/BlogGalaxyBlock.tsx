import { useEffect, useRef } from 'react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes';

const COLOR_PALETTES: Record<string, string[]> = {
  gold: ['#E8B800', '#F5CC33', '#FFE680', '#FFF3C2', '#FFFFFF'],
  navy: ['#072a1b', '#2B3B99', '#5BC8F0', '#AADDFF', '#FFFFFF'],
  mixed: ['#E8B800', '#5BC8F0', '#FFFFFF', '#F5CC33', '#7DD4F3'],
};

type Star = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  dAlpha: number;
  colorIdx: number;
};

function initStars(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.8 + 0.3,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    alpha: Math.random(),
    dAlpha: (Math.random() * 0.005 + 0.002) * (Math.random() < 0.5 ? 1 : -1),
    colorIdx: Math.floor(Math.random() * 5),
  }));
}

export default function BlogGalaxyBlock({ block, isEditing }: { block: BlogBlock; isEditing: boolean }) {
  const updateBlock = useBlogEditorStore((s) => s.updateBlock);
  const starCount = Number(block.data.starCount) || 200;
  const speed = Number(block.data.speed) || 0.5;
  const colorMode = String(block.data.colorMode ?? 'gold');
  const height = Number(block.data.height) || 400;
  const text = String(block.data.text ?? '');
  const subtext = String(block.data.subtext ?? '');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.offsetWidth;
    const H = height;
    canvas.width = W;
    canvas.height = H;

    const palette = COLOR_PALETTES[colorMode] || COLOR_PALETTES.gold;
    starsRef.current = initStars(starCount, W, H);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
      bg.addColorStop(0, '#0d1233');
      bg.addColorStop(1, '#080b1c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      starsRef.current.forEach((s) => {
        s.x += s.vx * speed;
        s.y += s.vy * speed;
        s.alpha += s.dAlpha;
        if (s.alpha <= 0 || s.alpha >= 1) s.dAlpha *= -1;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H;
        if (s.y > H) s.y = 0;

        const color = palette[s.colorIdx % palette.length];
        ctx.save();
        ctx.globalAlpha = s.alpha * 0.4;
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (Math.random() < 0.004) {
        const sx = Math.random() * W;
        const sy = Math.random() * H * 0.5;
        const len = 60 + Math.random() * 80;
        const trail = ctx.createLinearGradient(sx, sy, sx + len, sy + len * 0.4);
        trail.addColorStop(0, 'rgba(255,255,255,0)');
        trail.addColorStop(0.6, 'rgba(232,184,0,0.8)');
        trail.addColorStop(1, 'rgba(255,255,255,0.9)');
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + len, sy + len * 0.4);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [starCount, speed, colorMode, height]);

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {(text || subtext) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
          {text ? (
            <h2 className="text-balance text-3xl font-black leading-tight text-white drop-shadow-lg md:text-4xl">{text}</h2>
          ) : null}
          {subtext ? <p className="mt-3 text-lg text-brand-yellow drop-shadow">{subtext}</p> : null}
        </div>
      )}

      {isEditing ? (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-black/60 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/70">Heading</label>
              <input
                value={text}
                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                className="w-full rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
                placeholder="Title overlay"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/70">Subtext</label>
              <input
                value={subtext}
                onChange={(e) => updateBlock(block.id, { subtext: e.target.value })}
                className="w-full rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
                placeholder="Subtitle"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/70">Stars: {starCount}</label>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={starCount}
                onChange={(e) => updateBlock(block.id, { starCount: +e.target.value })}
                className="w-full accent-brand-yellow"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/70">Height: {height}px</label>
              <input
                type="range"
                min={200}
                max={700}
                step={50}
                value={height}
                onChange={(e) => updateBlock(block.id, { height: +e.target.value })}
                className="w-full accent-brand-yellow"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/70">Speed: {speed}</label>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={speed}
                onChange={(e) => updateBlock(block.id, { speed: +e.target.value })}
                className="w-full accent-brand-yellow"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/70">Palette</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.keys(COLOR_PALETTES).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateBlock(block.id, { colorMode: c })}
                    className={`rounded px-2 py-1 text-xs capitalize ${
                      colorMode === c ? 'bg-brand-yellow font-bold text-brand-blue' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
