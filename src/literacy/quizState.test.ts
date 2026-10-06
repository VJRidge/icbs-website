import { describe, expect, it } from 'vitest';
import { checkAnswer, createFreshAttempt, parseStoredAttempt } from './quizState';

describe('quizState', () => {
  it('locks the first checked answer and ignores later pending changes for scoring storage', () => {
    let state = createFreshAttempt('draft-1');
    state = { ...state, phase: 'question', pendingChoice: 1 };
    state = checkAnswer(state, 'q01');
    expect(state.submitted.q01).toBe(1);
    expect(state.feedbackVisible).toBe(true);
    state = { ...state, pendingChoice: 2 };
    state = checkAnswer(state, 'q01');
    expect(state.submitted.q01).toBe(1);
  });

  it('rejects stored attempts with a different content version', () => {
    expect(
      parseStoredAttempt(
        {
          contentVersion: 'old',
          phase: 'question',
          currentIndex: 2,
          pendingChoice: null,
          submitted: { q01: 0 },
          feedbackVisible: true,
          completed: false,
        },
        'draft-1',
      ),
    ).toBeNull();
  });
});
