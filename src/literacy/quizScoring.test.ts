import { describe, expect, it } from 'vitest';
import quizContent from './quiz-content.json';
import { normalizeQuestions, resultsCopy, scoreAttempt } from './quizScoring';
import { letterToIndex, type QuizContent } from './quizTypes';

const content = quizContent as QuizContent;
const questions = normalizeQuestions(content);

describe('literacy quiz content', () => {
  it('has 20 questions with section totals 7/7/6', () => {
    expect(questions).toHaveLength(20);
    expect(questions.filter((q) => q.section === 1)).toHaveLength(7);
    expect(questions.filter((q) => q.section === 2)).toHaveLength(7);
    expect(questions.filter((q) => q.section === 3)).toHaveLength(6);
    for (const q of questions) {
      expect(q.choices).toHaveLength(4);
      expect(['a', 'b', 'c', 'd']).toContain(q.correct);
    }
  });
});

describe('scoreAttempt', () => {
  it('scores all-correct and all-wrong', () => {
    const allCorrect = Object.fromEntries(questions.map((q) => [q.id, letterToIndex(q.correct)]));
    const perfect = scoreAttempt(questions, allCorrect);
    expect(perfect.totalCorrect).toBe(20);
    expect(perfect.sections.map((s) => s.correct)).toEqual([7, 7, 6]);
    expect(perfect.allMet).toBe(true);

    const allWrong = Object.fromEntries(questions.map((q) => [q.id, (letterToIndex(q.correct) + 1) % 4]));
    const zero = scoreAttempt(questions, allWrong);
    expect(zero.totalCorrect).toBe(0);
    expect(zero.belowThreshold).toEqual([2, 1, 3]);
  });

  it('prioritizes safety for the 15/20 example (6/7, 4/7, 5/6)', () => {
    const submitted: Record<string, number> = {};
    const bySection = { 1: questions.filter((q) => q.section === 1), 2: questions.filter((q) => q.section === 2), 3: questions.filter((q) => q.section === 3) };
    // reading 6/7: miss last
    bySection[1].forEach((q, i) => {
      submitted[q.id] = i === 6 ? (letterToIndex(q.correct) + 1) % 4 : letterToIndex(q.correct);
    });
    // safety 4/7: miss last 3
    bySection[2].forEach((q, i) => {
      submitted[q.id] = i >= 4 ? (letterToIndex(q.correct) + 1) % 4 : letterToIndex(q.correct);
    });
    // verification 5/6: miss last
    bySection[3].forEach((q, i) => {
      submitted[q.id] = i === 5 ? (letterToIndex(q.correct) + 1) % 4 : letterToIndex(q.correct);
    });

    const score = scoreAttempt(questions, submitted);
    expect(score.totalCorrect).toBe(15);
    expect(score.sections.map((s) => s.correct)).toEqual([6, 4, 5]);
    expect(score.belowThreshold[0]).toBe(2);
    const copy = resultsCopy(score);
    expect(copy.title).toBe('Your next step is clearer');
    expect(copy.opening.toLowerCase()).toContain('safety');
  });

  it('treats threshold boundaries correctly', () => {
    const make = (reading: number, safety: number, verification: number) => {
      const submitted: Record<string, number> = {};
      const fill = (section: 1 | 2 | 3, correctCount: number) => {
        const qs = questions.filter((q) => q.section === section);
        qs.forEach((q, i) => {
          submitted[q.id] = i < correctCount ? letterToIndex(q.correct) : (letterToIndex(q.correct) + 1) % 4;
        });
      };
      fill(1, reading);
      fill(2, safety);
      fill(3, verification);
      return scoreAttempt(questions, submitted);
    };

    expect(make(5, 5, 4).allMet).toBe(true);
    expect(make(4, 5, 4).belowThreshold).toContain(1);
    expect(make(5, 4, 4).belowThreshold[0]).toBe(2);
    expect(make(5, 5, 3).belowThreshold).toContain(3);
  });
});
