import type { QuizContent } from './quizTypes';
import { QUIZ_STORAGE_KEY } from './quizTypes';
import { normalizeQuestions, type SubmittedAnswers } from './quizScoring';

export type QuizPhase = 'intro' | 'question' | 'results' | 'review' | 'share';

export type QuizAttemptState = {
  contentVersion: string;
  phase: QuizPhase;
  currentIndex: number;
  pendingChoice: number | null;
  submitted: SubmittedAnswers;
  feedbackVisible: boolean;
  completed: boolean;
};

export function createFreshAttempt(contentVersion: string): QuizAttemptState {
  return {
    contentVersion,
    phase: 'intro',
    currentIndex: 0,
    pendingChoice: null,
    submitted: {},
    feedbackVisible: false,
    completed: false,
  };
}

export function answeredCount(submitted: SubmittedAnswers): number {
  return Object.keys(submitted).length;
}

export function parseStoredAttempt(raw: unknown, contentVersion: string): QuizAttemptState | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.contentVersion !== contentVersion) return null;
  const phase = row.phase;
  if (phase !== 'intro' && phase !== 'question' && phase !== 'results' && phase !== 'review' && phase !== 'share') {
    return null;
  }
  const currentIndex = typeof row.currentIndex === 'number' && Number.isFinite(row.currentIndex) ? Math.max(0, Math.floor(row.currentIndex)) : 0;
  const pendingChoice =
    typeof row.pendingChoice === 'number' && row.pendingChoice >= 0 && row.pendingChoice <= 3
      ? Math.floor(row.pendingChoice)
      : null;
  const submitted: SubmittedAnswers = {};
  if (row.submitted && typeof row.submitted === 'object') {
    for (const [id, value] of Object.entries(row.submitted as Record<string, unknown>)) {
      if (typeof value === 'number' && value >= 0 && value <= 3) submitted[id] = Math.floor(value);
    }
  }
  return {
    contentVersion,
    phase,
    currentIndex,
    pendingChoice,
    submitted,
    feedbackVisible: Boolean(row.feedbackVisible),
    completed: Boolean(row.completed),
  };
}

export function loadAttempt(content: QuizContent, storage: Storage | null = defaultStorage()): QuizAttemptState {
  const fresh = createFreshAttempt(content.version);
  if (!storage) return fresh;
  try {
    const raw = storage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = parseStoredAttempt(JSON.parse(raw), content.version);
    if (!parsed) return fresh;
    const maxIndex = Math.max(0, normalizeQuestions(content).length - 1);
    return { ...parsed, currentIndex: Math.min(parsed.currentIndex, maxIndex) };
  } catch {
    return fresh;
  }
}

export function saveAttempt(state: QuizAttemptState, storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage may be blocked */
  }
}

export function clearAttempt(storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(QUIZ_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function defaultStorage(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function checkAnswer(
  state: QuizAttemptState,
  questionId: string,
): QuizAttemptState {
  if (state.pendingChoice == null) return state;
  if (questionId in state.submitted) {
    return { ...state, feedbackVisible: true };
  }
  return {
    ...state,
    submitted: { ...state.submitted, [questionId]: state.pendingChoice },
    feedbackVisible: true,
  };
}

export function goToQuestion(state: QuizAttemptState, index: number, questionCount: number): QuizAttemptState {
  const next = Math.max(0, Math.min(questionCount - 1, index));
  const atSubmitted = false; // caller sets feedback from whether current q submitted
  return {
    ...state,
    phase: 'question',
    currentIndex: next,
    pendingChoice: null,
    feedbackVisible: atSubmitted,
  };
}
