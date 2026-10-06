import { SECTION_META, type SectionId } from './quizTypes';
import type { QuizScore } from './quizScoring';

/** Draw a 1080×1080 shareable score card. Returns a PNG blob. */
export async function renderScoreCardPng(score: QuizScore): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available.');

  try {
    await document.fonts.ready;
  } catch {
    /* fonts may not be queryable */
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Orange border
  ctx.strokeStyle = '#F47B35';
  ctx.lineWidth = 16;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  ctx.fillStyle = '#165B3B';
  ctx.font = '700 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VettaJimale.Tech', size / 2, 140);

  ctx.fillStyle = '#171717';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.fillText('VIBE CODING LITERACY CHECK', size / 2, 210);

  // Yellow highlight behind score
  ctx.fillStyle = '#FFF176';
  ctx.fillRect(size / 2 - 220, 280, 440, 140);

  ctx.fillStyle = '#171717';
  ctx.font = '800 110px system-ui, sans-serif';
  ctx.fillText(`${score.totalCorrect} / ${score.totalQuestions}`, size / 2, 385);

  const reading = score.sections.find((s) => s.section === 1)!;
  const safety = score.sections.find((s) => s.section === 2)!;
  const verification = score.sections.find((s) => s.section === 3)!;
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.fillText(
    `${SECTION_META[1].short} ${reading.correct}/${reading.total}  ·  ${SECTION_META[2].short} ${safety.correct}/${safety.total}  ·  ${SECTION_META[3].short} ${verification.correct}/${verification.total}`,
    size / 2,
    500,
  );

  ctx.fillStyle = '#165B3B';
  ctx.font = 'italic 40px Georgia, serif';
  ctx.fillText('“AI confidence is not evidence.”', size / 2, 620);

  ctx.fillStyle = '#171717';
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillText('Take the check at VettaJimale.Tech', size / 2, 900);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not export score card.'));
      else resolve(blob);
    }, 'image/png');
  });
}

export function sectionBars(score: QuizScore): Array<{ id: SectionId; label: string; correct: number; total: number }> {
  return ([1, 2, 3] as SectionId[]).map((id) => {
    const row = score.sections.find((s) => s.section === id)!;
    return { id, label: SECTION_META[id].label, correct: row.correct, total: row.total };
  });
}

/** Render the score card and trigger a browser download. */
export async function downloadScoreCardPng(score: QuizScore, filename = 'vibe-coding-literacy-check.png'): Promise<void> {
  const blob = await renderScoreCardPng(score);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
