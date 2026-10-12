import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/SiteHeader'
import quizContent from './quiz-content.json'
import {
  QUIZ_PATH,
  SECTION_META,
  indexToLetter,
  type QuizContent,
  type SectionId,
} from './quizTypes'
import {
  checkAnswer,
  clearAttempt,
  createFreshAttempt,
  loadAttempt,
  saveAttempt,
  type QuizAttemptState,
} from './quizState'
import {
  isCorrectChoice,
  normalizeQuestions,
  resultsCopy,
  scoreAttempt,
  type QuizScore,
} from './quizScoring'
import { downloadScoreCardPng } from './scoreCard'
import './literacy.css'

const content = quizContent as QuizContent
const questions = normalizeQuestions(content)

const FREE_LINKS: Record<SectionId, { href: string; label: string }> = {
  1: { href: '/resources/builder-quick-reference', label: 'Builder Quick Reference' },
  2: { href: '/resources/tools-and-updates', label: 'Tools & Updates' },
  3: { href: '/resources/before-you-accept-done', label: 'Before You Accept Done' },
}

function scoreLabel(score: QuizScore): string {
  if (score.allMet) return 'Foundations taking shape'
  if (score.totalCorrect >= 15) return 'Solid start — tighten the weak section'
  if (score.totalCorrect >= 10) return 'Useful signal — practice the gaps'
  return 'Start with the fundamentals'
}

export default function LiteracyCheckPage() {
  const [state, setState] = useState<QuizAttemptState>(() => loadAttempt(content))
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [shareBusy, setShareBusy] = useState(false)
  const feedbackRef = useRef<HTMLDivElement | null>(null)
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const liveId = useId()

  useEffect(() => {
    document.title = 'Vibe Coding Literacy Check · VettaJimale.Tech'
  }, [])

  useEffect(() => {
    saveAttempt(state)
  }, [state])

  useEffect(() => {
    if (state.feedbackVisible && state.phase === 'question') feedbackRef.current?.focus()
    if (state.phase === 'results' || state.phase === 'share') resultsHeadingRef.current?.focus()
  }, [state.phase, state.feedbackVisible, state.currentIndex])

  const question = questions[state.currentIndex] ?? null
  const progressPct = Math.round(
    (Object.keys(state.submitted).length / Math.max(questions.length, 1)) * 100,
  )

  const score = useMemo(() => {
    if (!state.completed) return null
    return scoreAttempt(questions, state.submitted)
  }, [state.completed, state.submitted])

  const copy = score ? resultsCopy(score) : null

  function persist(next: QuizAttemptState) {
    setState(next)
  }

  function startQuiz() {
    persist({ ...createFreshAttempt(content.version), phase: 'question' })
  }

  function resumeQuiz() {
    persist({ ...state, phase: 'question', feedbackVisible: false, pendingChoice: null })
  }

  function selectChoice(index: number) {
    if (state.feedbackVisible || !question || question.id in state.submitted) return
    persist({ ...state, pendingChoice: index })
  }

  function lockAnswer() {
    if (!question || state.pendingChoice == null) return
    persist(checkAnswer(state, question.id))
  }

  function nextAfterFeedback() {
    if (!question) return
    const nextIndex = state.currentIndex + 1
    if (nextIndex >= questions.length) {
      persist({
        ...state,
        phase: 'results',
        completed: true,
        feedbackVisible: false,
        pendingChoice: null,
        currentIndex: questions.length - 1,
      })
      return
    }
    persist({
      ...state,
      currentIndex: nextIndex,
      pendingChoice: null,
      feedbackVisible: false,
      phase: 'question',
    })
  }

  async function handleDownloadCard() {
    if (!score) return
    setShareBusy(true)
    try {
      await downloadScoreCardPng(score)
    } finally {
      setShareBusy(false)
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}${QUIZ_PATH}`
    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('Challenge link copied.')
    } catch {
      setCopyStatus('Could not copy — select the address bar and copy manually.')
    }
  }

  function resetQuiz() {
    clearAttempt()
    persist(createFreshAttempt(content.version))
    setCopyStatus(null)
  }

  return (
    <div className="literacy-page">
      <SiteHeader />
      <main className="literacy-main">
        <nav aria-label="Breadcrumb" className="eyebrow">
          <a href="/resources">Resources</a> / Literacy Check
        </nav>
        <p className="eyebrow" style={{ marginTop: '0.75rem' }}>
          Free resource
        </p>
        <h1>Vibe Coding Literacy Check</h1>

        {state.phase === 'intro' ? (
          <IntroScreen
            hasProgress={Object.keys(state.submitted).length > 0 && !state.completed}
            onStart={startQuiz}
            onResume={resumeQuiz}
          />
        ) : null}

        {state.phase === 'question' && question && !state.feedbackVisible ? (
          <QuestionScreen
            question={question}
            index={state.currentIndex}
            total={questions.length}
            progressPct={progressPct}
            selected={state.pendingChoice}
            onSelect={selectChoice}
            onSubmit={lockAnswer}
            liveId={liveId}
          />
        ) : null}

        {state.phase === 'question' && question && state.feedbackVisible ? (
          <FeedbackScreen
            question={question}
            selectedIndex={state.submitted[question.id] ?? state.pendingChoice ?? 0}
            feedbackRef={feedbackRef}
            onNext={nextAfterFeedback}
            isLast={state.currentIndex >= questions.length - 1}
          />
        ) : null}

        {(state.phase === 'results' || state.phase === 'share') && score && copy ? (
          <ResultsScreen
            score={score}
            copy={copy}
            headingRef={resultsHeadingRef}
            copyStatus={copyStatus}
            shareBusy={shareBusy}
            onDownload={handleDownloadCard}
            onCopy={handleCopyLink}
            onReview={() => persist({ ...state, phase: 'review' })}
            onReset={resetQuiz}
          />
        ) : null}

        {state.phase === 'review' ? (
          <ReviewScreen
            submitted={state.submitted}
            onBack={() => persist({ ...state, phase: 'results' })}
          />
        ) : null}
      </main>
      <Footer />
    </div>
  )
}

function IntroScreen({
  onStart,
  hasProgress,
  onResume,
}: {
  onStart: () => void
  hasProgress: boolean
  onResume: () => void
}) {
  return (
    <>
      <p className="literacy-lede">
        Twenty questions. Three sections. Instant feedback. No signup — your answers stay in this browser session.
      </p>
      <ul>
        <li>
          <strong>{SECTION_META[1].label}</strong> — can you find the signal in the noise?
        </li>
        <li>
          <strong>{SECTION_META[2].label}</strong> — what do you refuse to paste or approve?
        </li>
        <li>
          <strong>{SECTION_META[3].label}</strong> — how do you check before you ship?
        </li>
      </ul>
      <p>
        Pass bars: {SECTION_META[1].short} {SECTION_META[1].threshold}/{SECTION_META[1].total} ·{' '}
        {SECTION_META[2].short} {SECTION_META[2].threshold}/{SECTION_META[2].total} ·{' '}
        {SECTION_META[3].short} {SECTION_META[3].threshold}/{SECTION_META[3].total}.
      </p>
      <div className="literacy-actions">
        {hasProgress ? (
          <>
            <button type="button" className="btn" onClick={onResume}>
              Resume
            </button>
            <button type="button" className="btn line" onClick={onStart}>
              Start over
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={onStart}>
            Start the check
          </button>
        )}
        <a className="btn line" href="/resources">
          All free resources
        </a>
      </div>
    </>
  )
}

function QuestionScreen({
  question,
  index,
  total,
  progressPct,
  selected,
  onSelect,
  onSubmit,
  liveId,
}: {
  question: (typeof questions)[number]
  index: number
  total: number
  progressPct: number
  selected: number | null
  onSelect: (index: number) => void
  onSubmit: () => void
  liveId: string
}) {
  const section = SECTION_META[question.section as SectionId]
  return (
    <>
      <div className="literacy-progress" aria-hidden="true">
        <div className="literacy-progress-track">
          <div className="literacy-progress-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
        </div>
      </div>
      <p id={liveId} className="literacy-live" aria-live="polite">
        Question {index + 1} of {total}. {section.short} section.
      </p>
      <p className="eyebrow">
        Question {index + 1} of {total} · {section.short}
      </p>
      <h2 style={{ whiteSpace: 'pre-wrap' }}>{question.prompt}</h2>
      <div role="radiogroup" aria-labelledby={liveId}>
        {question.choices.map((text, choiceIndex) => {
          const letter = indexToLetter(choiceIndex)
          return (
            <button
              key={choiceIndex}
              type="button"
              role="radio"
              aria-checked={selected === choiceIndex}
              className="literacy-choice"
              data-selected={selected === choiceIndex ? 'true' : 'false'}
              onClick={() => onSelect(choiceIndex)}
            >
              <span aria-hidden="true">{letter?.toUpperCase()}.</span>
              <span>{text}</span>
            </button>
          )
        })}
      </div>
      <div className="literacy-actions">
        <button type="button" className="btn" disabled={selected == null} onClick={onSubmit}>
          Lock in answer
        </button>
      </div>
    </>
  )
}

function FeedbackScreen({
  question,
  selectedIndex,
  feedbackRef,
  onNext,
  isLast,
}: {
  question: (typeof questions)[number]
  selectedIndex: number
  feedbackRef: React.RefObject<HTMLDivElement | null>
  onNext: () => void
  isLast: boolean
}) {
  const correct = isCorrectChoice(question, selectedIndex)
  const correctIndex = question.correct.charCodeAt(0) - 'a'.charCodeAt(0)
  return (
    <>
      <div
        ref={feedbackRef}
        tabIndex={-1}
        className="literacy-feedback"
        data-wrong={correct ? 'false' : 'true'}
        role="status"
      >
        <p>
          <strong>{correct ? 'Correct.' : 'Not quite.'}</strong>
        </p>
        {!correct ? (
          <p>
            The better answer:{' '}
            <strong>
              {question.correct.toUpperCase()}. {question.choices[correctIndex]}
            </strong>
          </p>
        ) : null}
        <p>{question.explanation}</p>
      </div>
      <div className="literacy-actions">
        <button type="button" className="btn" onClick={onNext}>
          {isLast ? 'See results' : 'Next question'}
        </button>
      </div>
    </>
  )
}

function ResultsScreen({
  score,
  copy,
  headingRef,
  copyStatus,
  shareBusy,
  onDownload,
  onCopy,
  onReview,
  onReset,
}: {
  score: QuizScore
  copy: ReturnType<typeof resultsCopy>
  headingRef: React.RefObject<HTMLHeadingElement | null>
  copyStatus: string | null
  shareBusy: boolean
  onDownload: () => void
  onCopy: () => void
  onReview: () => void
  onReset: () => void
}) {
  const label = scoreLabel(score)
  return (
    <>
      <h2 ref={headingRef} tabIndex={-1}>
        {copy.title}
      </h2>
      {copy.subtitle ? <p className="eyebrow">{copy.subtitle}</p> : null}
      <p className="literacy-score">
        {score.totalCorrect}/{score.totalQuestions}
      </p>
      <p>
        <span className="literacy-highlight">{label}</span>
      </p>
      <p>{copy.opening}</p>
      {score.sections.map((s) => {
        const meta = SECTION_META[s.section]
        return (
          <div key={s.section}>
            <p>
              <strong>{meta.label}</strong> — {s.correct}/{s.total}{' '}
              {s.met ? '(pass)' : `(below ${s.threshold})`}
            </p>
            <div className="literacy-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((s.correct / s.total) * 100)}%` }} />
            </div>
          </div>
        )
      })}
      {copy.guidance.length > 0 ? (
        <>
          <h2>What to do next</h2>
          <ol>
            {copy.guidance.map((g) => {
              const free = FREE_LINKS[g.section]
              return (
                <li key={g.section} style={{ marginBottom: '0.75rem' }}>
                  <strong>{g.heading}</strong>
                  <div>{g.body}</div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <a href={free.href}>{free.label}</a>
                    <span aria-hidden="true"> · </span>
                    <span>{g.book}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <>
          <h2>Keep going</h2>
          <p>
            Review any misses, then try{' '}
            <a href="/resources/builder-quick-reference">Builder Quick Reference</a> on a small
            change.
          </p>
        </>
      )}
      <div className="literacy-actions literacy-no-print">
        <button type="button" className="btn" disabled={shareBusy} onClick={onDownload}>
          {shareBusy ? 'Preparing…' : 'Download score card'}
        </button>
        <button type="button" className="btn line" onClick={onCopy}>
          Copy challenge link
        </button>
        <button type="button" className="btn line" onClick={onReview}>
          Review answers
        </button>
        <button type="button" className="btn line" onClick={onReset}>
          Retake
        </button>
        <a className="btn line" href="/resources">
          More free tools
        </a>
      </div>
      {copyStatus ? (
        <p role="status" style={{ marginTop: '0.75rem' }}>
          {copyStatus}
        </p>
      ) : null}
    </>
  )
}

function ReviewScreen({
  submitted,
  onBack,
}: {
  submitted: Record<string, number>
  onBack: () => void
}) {
  return (
    <>
      <h2>Answer review</h2>
      {questions.map((q, i) => {
        const picked = submitted[q.id]
        const ok = typeof picked === 'number' && isCorrectChoice(q, picked)
        const correctIndex = q.correct.charCodeAt(0) - 'a'.charCodeAt(0)
        const meta = SECTION_META[q.section as SectionId]
        return (
          <article
            key={q.id}
            style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}
          >
            <p className="eyebrow">
              Q{i + 1} · {meta.short} · {ok ? 'Correct' : 'Missed'}
            </p>
            <h3 style={{ fontSize: '1.1rem', margin: '0.35rem 0', whiteSpace: 'pre-wrap' }}>
              {q.prompt}
            </h3>
            <p>
              Your answer:{' '}
              {typeof picked === 'number'
                ? `${indexToLetter(picked)?.toUpperCase()}. ${q.choices[picked]}`
                : '—'}
            </p>
            {!ok ? (
              <p>
                Better answer: {q.correct.toUpperCase()}. {q.choices[correctIndex]}
              </p>
            ) : null}
            <p>{q.explanation}</p>
          </article>
        )
      })}
      <div className="literacy-actions">
        <button type="button" className="btn" onClick={onBack}>
          Back to results
        </button>
      </div>
    </>
  )
}
