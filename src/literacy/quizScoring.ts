import {
  SECTION_META,
  letterToIndex,
  type QuizContent,
  type QuizLetter,
  type QuizQuestion,
  type SectionId,
} from './quizTypes';

export type SectionScore = {
  section: SectionId;
  correct: number;
  total: number;
  threshold: number;
  met: boolean;
  missed: QuizQuestion[];
};

export type QuizScore = {
  totalCorrect: number;
  totalQuestions: number;
  sections: SectionScore[];
  belowThreshold: SectionId[];
  allMet: boolean;
};

/** Submitted answers keyed by question id → first locked choice index 0–3. */
export type SubmittedAnswers = Record<string, number>;

export function normalizeQuestions(content: QuizContent): QuizQuestion[] {
  return [...content.questions].sort((a, b) => a.number - b.number);
}

export function isCorrectChoice(question: QuizQuestion, choiceIndex: number): boolean {
  return choiceIndex === letterToIndex(question.correct);
}

export function scoreAttempt(questions: QuizQuestion[], submitted: SubmittedAnswers): QuizScore {
  const bySection = new Map<SectionId, { correct: number; missed: QuizQuestion[] }>([
    [1, { correct: 0, missed: [] }],
    [2, { correct: 0, missed: [] }],
    [3, { correct: 0, missed: [] }],
  ]);

  let totalCorrect = 0;
  for (const q of questions) {
    const section = q.section as SectionId;
    const choice = submitted[q.id];
    const bucket = bySection.get(section)!;
    if (typeof choice === 'number' && isCorrectChoice(q, choice)) {
      totalCorrect += 1;
      bucket.correct += 1;
    } else if (typeof choice === 'number') {
      bucket.missed.push(q);
    } else {
      bucket.missed.push(q);
    }
  }

  const sections: SectionScore[] = ([1, 2, 3] as SectionId[]).map((section) => {
    const meta = SECTION_META[section];
    const bucket = bySection.get(section)!;
    return {
      section,
      correct: bucket.correct,
      total: meta.total,
      threshold: meta.threshold,
      met: bucket.correct >= meta.threshold,
      missed: bucket.missed,
    };
  });

  // Safety first when recommending review, then reading, then verification.
  const priority: SectionId[] = [2, 1, 3];
  const belowThreshold = priority.filter((id) => !sections.find((s) => s.section === id)!.met);

  return {
    totalCorrect,
    totalQuestions: questions.length,
    sections,
    belowThreshold,
    allMet: belowThreshold.length === 0,
  };
}

export function resultsCopy(score: QuizScore): {
  title: string;
  subtitle: string | null;
  opening: string;
  guidance: Array<{ section: SectionId; heading: string; body: string; book: string }>;
} {
  if (score.allMet) {
    return {
      title: 'Your foundations are taking shape',
      subtitle: null,
      opening:
        'You met the study target in all three sections. Review any missed answers, then practice these habits in a small project.',
      guidance: score.sections
        .filter((s) => s.missed.length > 0)
        .map((s) => guidanceFor(s.section)),
    };
  }

  const ordered = score.belowThreshold;
  return {
    title: 'Your next step is clearer',
    subtitle: 'A map, not a verdict.',
    opening: openingFor(ordered[0]!),
    guidance: ordered.map((id) => guidanceFor(id)),
  };
}

function openingFor(section: SectionId): string {
  if (section === 2) return 'Start with safety basics.';
  if (section === 1) return 'Start with navigating your project.';
  return 'Turn “done” into evidence.';
}

function guidanceFor(section: SectionId): {
  section: SectionId;
  heading: string;
  body: string;
  book: string;
} {
  if (section === 1) {
    return {
      section,
      heading: 'Start with navigating your project',
      body: 'Practice reading a diff, finding an error’s file and line, and saving a known-good commit.',
      book: 'Chapter 4, Prep Roadmap items 1–5; Chapter 7 for Git.',
    };
  }
  if (section === 2) {
    return {
      section,
      heading: 'Start with keys and data access',
      body: 'Review secret handling, key restrictions, logout behavior, and who can read private data. Quizzes do not replace security testing.',
      book: 'Chapter 4, especially secrets and the Prep Roadmap item 7.',
    };
  }
  return {
    section,
    heading: 'Turn “done” into evidence',
    body: 'Reproduce the behavior, check related flows, and record what you tested.',
    book: 'Chapter 8 debugging process and Chapters 9–10 proof before launch.',
  };
}

export function choiceLabel(question: QuizQuestion, letter: QuizLetter): string {
  const idx = letterToIndex(letter);
  return String(question.choices[idx] ?? '');
}
