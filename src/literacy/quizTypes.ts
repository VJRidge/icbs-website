export type QuizLetter = 'a' | 'b' | 'c' | 'd';

export type QuizQuestion = {
  id: string;
  number: number;
  section: 1 | 2 | 3;
  prompt: string;
  choices: [string, string, string, string] | string[];
  correct: QuizLetter;
  explanation: string;
};

export type QuizContent = {
  version: string;
  status?: string;
  questions: QuizQuestion[];
};

export type SectionId = 1 | 2 | 3;

export const SECTION_META: Record<
  SectionId,
  { key: 'reading' | 'safety' | 'verification'; label: string; total: number; threshold: number; short: string }
> = {
  1: {
    key: 'reading',
    label: 'Reading & navigating',
    short: 'Reading',
    total: 7,
    threshold: 5,
  },
  2: {
    key: 'safety',
    label: 'Safety & secrets',
    short: 'Safety',
    total: 7,
    threshold: 5,
  },
  3: {
    key: 'verification',
    label: 'Verification & judgment',
    short: 'Verification',
    total: 6,
    threshold: 4,
  },
};

export const QUIZ_PATH = '/resources/vibe-coding-literacy-check';
export const QUIZ_STORAGE_KEY = 'vj-literacy-check-attempt';

export function letterToIndex(letter: QuizLetter): number {
  return letter.charCodeAt(0) - 'a'.charCodeAt(0);
}

export function indexToLetter(index: number): QuizLetter | null {
  if (index < 0 || index > 3) return null;
  return String.fromCharCode('a'.charCodeAt(0) + index) as QuizLetter;
}
