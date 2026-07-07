import { useEffect, useMemo, useState } from 'react'
import {
  AVAILABLE_CHAPTERS,
  isChapterId,
  loadQuestions,
  toDisplayChapter,
  type ChapterId
} from './data/loadQuestions'
import type { NormalizedQuestionUnion, QuestionAnswer, QuestionResult } from './types/question'
import { normalizeText } from './lib/normalize'
import { clearProgress, loadProgress, saveProgress } from './lib/storage'
import { QuestionCard } from './components/QuestionCard'
import { ResultPanel } from './components/ResultPanel'
import { en } from './i18n/en'

type LearnMode = 'exam' | 'practice' | 'mistakes'

function hasAnswered(question: NormalizedQuestionUnion, answer: QuestionAnswer | undefined): boolean {
  if (!answer) {
    return false
  }
  if (question.type === 'matching_matrix') {
    const map = answer as Record<string, string>
    return question.answer.every((item) => typeof map[item.number] === 'string' && map[item.number].trim() !== '')
  }
  return String(answer).trim() !== ''
}

function isMatchingAnswerCorrect(
  expected: Array<{ number: string; component: string }>,
  answer: QuestionAnswer
) {
  const map = (answer as Record<string, string>) || {}
  return expected.every((item) => {
    return normalizeText(map[item.number] || '') === normalizeText(item.component)
  })
}

function buildMatchingResultText(
  expected: Array<{ number: string; component: string }>
): string {
  return expected
    .map((item) => `${item.number} → ${item.component}`)
    .join(' ; ')
}

function gradeQuestion(
  question: NormalizedQuestionUnion,
  answer: QuestionAnswer | undefined
): QuestionResult {
  if (question.type === 'single_choice') {
    const normalizedUser = normalizeText((answer as string) || '')
    const normalizedCorrect = normalizeText(question.answer)
    return {
      id: question.id,
      isCorrect: normalizedUser === normalizedCorrect,
      userAnswer: answer || '',
      correctAnswer: question.answer
    }
  }

  if (question.type === 'text_answer') {
    const normalizedUser = normalizeText((answer as string) || '')
    const normalizedCorrect = normalizeText(question.answer)
    return {
      id: question.id,
      isCorrect: normalizedUser === normalizedCorrect,
      userAnswer: answer || '',
      correctAnswer: question.answer
    }
  }

  const isCorrect = isMatchingAnswerCorrect(question.answer, answer || {})
  return {
    id: question.id,
    isCorrect,
    userAnswer: answer || {},
    correctAnswer: buildMatchingResultText(question.answer)
  }
}

function reconcileWrongQuestionIds(
  prevWrongQuestionIds: string[],
  questions: NormalizedQuestionUnion[],
  answers: Record<string, QuestionAnswer>,
  textSubmittedQuestionIds: string[],
  requireTextSubmitToEvaluate: boolean
): string[] {
  const next = new Set(prevWrongQuestionIds)
  const textSubmittedSet = new Set(textSubmittedQuestionIds)

  questions.forEach((question) => {
    const answer = answers[question.id]

    if (
      requireTextSubmitToEvaluate &&
      question.type === 'text_answer' &&
      !textSubmittedSet.has(question.id)
    ) {
      return
    }

    if (!hasAnswered(question, answer)) {
      return
    }

    const result = gradeQuestion(question, answer)
    if (result.isCorrect) {
      next.delete(question.id)
    } else {
      next.add(question.id)
    }
  })

  return Array.from(next)
}

function formatTime(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`
}

export default function App() {
  const [questions, setQuestions] = useState<NormalizedQuestionUnion[]>([])
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [mode, setMode] = useState<LearnMode>('exam')
  const [selectedChapter, setSelectedChapter] = useState<ChapterId>('chap2')
  const [isReadyToSave, setIsReadyToSave] = useState(false)
  const [wrongQuestionIds, setWrongQuestionIds] = useState<string[]>([])
  const [textSubmittedQuestionIds, setTextSubmittedQuestionIds] = useState<string[]>([])

  useEffect(() => {
    let isActive = true
    const now = Date.now()
    setQuestions([])
    setAnswers({})
    setWrongQuestionIds([])
    setTextSubmittedQuestionIds([])
    setIsSubmitted(false)
    setScore(0)
    setMode('exam')
    setError(null)
    setStartedAt(now)
    setNowTick(now)
    setIsReadyToSave(false)
    setLoading(true)

    loadQuestions(selectedChapter)
      .then((data) => {
        if (!isActive) return
        setQuestions(data)

        const saved = loadProgress(selectedChapter)
        if (saved) {
          const loadedAnswers: Record<string, QuestionAnswer> = {}
          data.forEach((question) => {
            if (saved.answers && Object.prototype.hasOwnProperty.call(saved.answers, question.id)) {
              loadedAnswers[question.id] = saved.answers[question.id] as QuestionAnswer
            }
          })
          if (Object.keys(loadedAnswers).length > 0) {
            setAnswers(loadedAnswers)
          }
          setIsSubmitted(saved.isSubmitted || false)
          setScore(typeof saved.score === 'number' ? saved.score : 0)
          setMode(saved.mode || 'exam')
          setWrongQuestionIds(Array.isArray(saved.wrongQuestionIds) ? saved.wrongQuestionIds : [])
          setTextSubmittedQuestionIds(
            Array.isArray(saved.textSubmittedQuestionIds) ? saved.textSubmittedQuestionIds : []
          )
          setStartedAt(
            Number.isFinite(saved.startedAt) && saved.startedAt > 0 ? saved.startedAt : Date.now()
          )
        }
        setIsReadyToSave(true)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isActive) return
        setError(err instanceof Error ? err.message : en.app.loadDataError)
        setLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [selectedChapter])

  useEffect(() => {
    if (mode === 'exam' && !isSubmitted) {
      return
    }

    setWrongQuestionIds((prevWrongQuestionIds) =>
      reconcileWrongQuestionIds(
        prevWrongQuestionIds,
        questions,
        answers,
        textSubmittedQuestionIds,
        mode !== 'exam'
      )
    )
  }, [questions, answers, mode, isSubmitted, textSubmittedQuestionIds])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!isSubmitted || mode !== 'exam') {
        setNowTick(Date.now())
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode, isSubmitted])

  const elapsedSeconds = useMemo(() => {
    return Math.max(0, Math.floor((nowTick - startedAt) / 1000))
  }, [nowTick, startedAt])

  const visibleQuestions = useMemo(() => {
    if (mode === 'mistakes') {
      const mistakeSet = new Set(wrongQuestionIds)
      return questions.filter((q) => mistakeSet.has(q.id))
    }
    return questions
  }, [questions, mode, wrongQuestionIds])

  const textSubmittedSet = useMemo(() => new Set(textSubmittedQuestionIds), [textSubmittedQuestionIds])

  const visibleQuestionSet = useMemo(() => {
    return new Set(visibleQuestions.map((question) => question.id))
  }, [visibleQuestions])

  const questionMap = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]))
  }, [questions])

  const answeredCount = useMemo(() => {
    return visibleQuestions.filter((question) => hasAnswered(question, answers[question.id])).length
  }, [visibleQuestions, answers])

  const results: QuestionResult[] = useMemo(
    () => questions.map((question) => gradeQuestion(question, answers[question.id])),
    [answers, questions]
  )

  const visibleResults = useMemo(
    () => results.filter((result) => visibleQuestionSet.has(result.id)),
    [results, visibleQuestionSet]
  )

  const correctCount = useMemo(() => {
    if (mode === 'exam') {
      return results.filter((item) => item.isCorrect).length
    }
    return visibleResults.filter((item) => {
      const question = questionMap.get(item.id)
      if (!question) {
        return false
      }
      if (question.type === 'text_answer' && !textSubmittedSet.has(item.id)) {
        return false
      }
      return item.isCorrect
    }).length
  }, [questionMap, visibleResults, mode, textSubmittedSet])

  const canSubmit = visibleQuestions.length > 0 && answeredCount === visibleQuestions.length

  const currentQuestionCount = visibleQuestions.length

  const progressPercent = currentQuestionCount === 0
    ? 0
    : Math.round((answeredCount / currentQuestionCount) * 100)

  const accuracyPercent = currentQuestionCount === 0
    ? 0
    : Math.round((correctCount / currentQuestionCount) * 100)

  useEffect(() => {
    if (!questions.length || !isReadyToSave) return
    saveProgress(selectedChapter, {
      answers,
      isSubmitted: isSubmitted && mode === 'exam',
      score: isSubmitted && mode === 'exam' ? score : null,
      startedAt,
      lastRunAt: Date.now(),
      mode,
      wrongQuestionIds,
      textSubmittedQuestionIds
    })
  }, [answers, isSubmitted, score, startedAt, mode, wrongQuestionIds, textSubmittedQuestionIds, isReadyToSave, questions.length, selectedChapter])

  function handleSingleChoice(questionId: string, value: string) {
    if (isSubmitted && mode === 'exam') {
      return
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleTextAnswer(questionId: string, value: string) {
    if (isSubmitted && mode === 'exam') {
      return
    }
    setTextSubmittedQuestionIds((prev) => prev.filter((id) => id !== questionId))
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleMatchingAnswer(questionId: string, number: string, value: string) {
    if (isSubmitted && mode === 'exam') {
      return
    }
    setAnswers((prev) => {
      const existed = (typeof prev[questionId] === 'object' && prev[questionId] !== null
        ? (prev[questionId] as Record<string, string>)
        : {}) as Record<string, string>
      return {
        ...prev,
        [questionId]: {
          ...existed,
          [number]: value
        }
      }
    })
  }

  function getResultForQuestion(id: string): QuestionResult | undefined {
    return results.find((item) => item.id === id)
  }

  function handleTextSubmit(questionId: string) {
    const question = questions.find((item) => item.id === questionId)
    if (!question || question.type !== 'text_answer') {
      return
    }

    const answer = answers[questionId]
    if (!hasAnswered(question, answer)) {
      return
    }

    setTextSubmittedQuestionIds((prev) =>
      prev.includes(questionId) ? prev : [...prev, questionId]
    )
  }

  function handleSubmit() {
    if (mode !== 'exam' || isSubmitted) return
    const finalWrong = reconcileWrongQuestionIds(
      wrongQuestionIds,
      questions,
      answers,
      textSubmittedQuestionIds,
      false
    )
    setWrongQuestionIds(finalWrong)
    setScore(results.filter((item) => item.isCorrect).length)
    setIsSubmitted(true)
  }

  function handleResetAnswers() {
    setAnswers({})
    setTextSubmittedQuestionIds([])
    setIsSubmitted(false)
    setScore(0)
    setStartedAt(Date.now())
    setNowTick(Date.now())
    clearProgress(selectedChapter)
  }

  function handleClearWrongHistory() {
    setWrongQuestionIds([])
  }

  function handleModeChange(next: LearnMode) {
    setMode(next)
    setIsSubmitted(false)
    setStartedAt(Date.now())
    setNowTick(Date.now())
  }

  function handleChapterChange(chapterInput: string) {
    if (!isChapterId(chapterInput) || chapterInput === selectedChapter) {
      return
    }
    setSelectedChapter(chapterInput)
  }

  function getModeLabel(label: LearnMode): string {
    if (label === 'exam') return en.app.modeLabel.exam
    if (label === 'practice') return en.app.modeLabel.practice
    return en.app.modeLabel.mistakes
  }

  function getModeHint() {
    if (mode === 'exam') {
      return canSubmit ? en.app.modeHint.examReady : en.app.modeHint.examIncomplete
    }
    if (mode === 'practice') {
      return en.app.modeHint.practice
    }
    return wrongQuestionIds.length === 0
      ? en.app.modeHint.mistakesEmpty
      : en.app.modeHint.mistakes
  }

  if (loading) {
    return (
      <main className="app">
        <section className="status-card card">
          <h1>{en.app.loadingTitle}</h1>
          <p>{en.app.loadingDescription(selectedChapter)}</p>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="app">
        <section className="status-card card">
          <h1>{en.app.errorTitle}</h1>
          <p>{error}</p>
        </section>
      </main>
    )
  }

  const lockInput = mode === 'exam' && isSubmitted
  const activeSubmitText = mode === 'exam'
    ? isSubmitted
      ? en.app.status.submit.submitted
      : `${en.app.status.submit.submitLabel} ${answeredCount}/${currentQuestionCount}`
    : en.app.status.submit.practiceModeLabel

  return (
    <main className="app">
      <header className="topbar card">
        <div className="topbar-main">
          <div>
            <p className="eyebrow">{en.app.eyebrow}</p>
            <h1>{questions[0]?.chapter || `${toDisplayChapter(selectedChapter)}`}</h1>
            <p className="subtitle">{getModeLabel(mode)}</p>
          </div>
          <div className="chapter-switch">
            <label htmlFor="chapter-select" className="chapter-switch-label">
              {en.app.chapterSelectLabel}
            </label>
            <select
              id="chapter-select"
              value={selectedChapter}
              className="chapter-select"
              onChange={(event) => handleChapterChange(event.target.value)}
            >
              {AVAILABLE_CHAPTERS.map((item) => (
                <option key={item} value={item}>
                  {toDisplayChapter(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="mode-stats">
            <div className="mode-stat">
              <span>{en.app.status.stats.progress}</span>
              <strong>{answeredCount}/{currentQuestionCount}</strong>
            </div>
            <div className="mode-stat">
              <span>{en.app.status.stats.time}</span>
              <strong>{formatTime(elapsedSeconds)}</strong>
            </div>
            {mode === 'exam' && isSubmitted ? (
              <div className="mode-stat">
                <span>{en.app.status.stats.score}</span>
                <strong>{score}/{currentQuestionCount}</strong>
              </div>
            ) : null}
            {mode !== 'exam' ? (
              <div className="mode-stat">
                <span>{en.app.status.stats.correct}</span>
                <strong>
                  {correctCount}/{currentQuestionCount} ({accuracyPercent}%)
                </strong>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mode-switch">
          <button
            type="button"
            className={mode === 'exam' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => handleModeChange('exam')}
          >
            {en.app.modeLabel.exam}
          </button>
          <button
            type="button"
            className={mode === 'practice' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => handleModeChange('practice')}
          >
            {en.app.modeLabel.practice}
          </button>
          <button
            type="button"
            className={mode === 'mistakes' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => handleModeChange('mistakes')}
          >
            {en.app.modeLabel.mistakes}
          </button>
        </div>

        <div className="progress-wrap">
          <div className="progress-meta">
            <span>
              {mode === 'exam'
                ? en.app.status.progressMetaExam
                : en.app.status.progressMetaPractice}
            </span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </header>

      <section className="content">
        <section className="session-tip card">
          <p>{getModeHint()}</p>
        </section>

        <section className="question-list-card card">
        {mode === 'mistakes' && wrongQuestionIds.length === 0 ? (
          <section className="status-card">
            <h2>{en.app.status.emptyWrongTitle}</h2>
            <p>{en.app.status.emptyWrongBody}</p>
          </section>
        ) : (
          <>
            <div className="questions">
              {visibleQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  answer={answers[question.id] || ''}
                  showResult={
                    mode === 'exam'
                      ? isSubmitted
                      : question.type === 'text_answer'
                        ? textSubmittedSet.has(question.id)
                        : hasAnswered(question, answers[question.id])
                  }
                  locked={lockInput}
                  onSingleChoice={handleSingleChoice}
                  onTextAnswer={handleTextAnswer}
                  onMatching={handleMatchingAnswer}
                  onTextSubmit={mode === 'exam' ? undefined : handleTextSubmit}
                  result={getResultForQuestion(question.id)}
                />
              ))}
            </div>

            {mode === 'exam' ? (
              <div className="submit-row">
                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitted}
                >
                  {activeSubmitText}
                </button>
              </div>
            ) : null}
          </>
        )}
        </section>

        <ResultPanel
          totalQuestions={currentQuestionCount}
          correctAnswers={correctCount}
          elapsedSeconds={elapsedSeconds}
          answeredCount={answeredCount}
          onReset={handleResetAnswers}
        />

        <div className="extra-actions">
          <button type="button" className="ghost-btn" onClick={handleResetAnswers}>
            {en.app.status.buttons.clearAnswers}
          </button>
          <button type="button" className="ghost-btn" onClick={handleClearWrongHistory}>
            {en.app.status.buttons.clearWrongHistory}
          </button>
        </div>
      </section>
    </main>
  )
}
