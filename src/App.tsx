import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AVAILABLE_CHAPTERS,
  isChapterId,
  loadQuestions,
  loadAllQuestions,
  toDisplayChapter,
  type ChapterId
} from './data/loadQuestions'
import type { NormalizedQuestionUnion, QuestionAnswer, QuestionResult } from './types/question'
import { normalizeText } from './lib/normalize'
import {
  clearAllReviewProgress,
  clearProgress,
  loadAllReviewProgress,
  loadProgress,
  saveAllReviewProgress,
  saveProgress
} from './lib/storage'
import { QuestionCard } from './components/QuestionCard'
import { ResultPanel } from './components/ResultPanel'
import { en } from './i18n/en'

type LearnMode = 'exam' | 'practice' | 'mistakes' | 'mixed_review'

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

function shuffleIds(questionIds: string[]): string[] {
  const pool = [...questionIds]
  for (let index = pool.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]]
  }
  return pool
}

function getNextQuestionIdFromQueue(queue: string[]): { nextQuestionId: string | null; nextQueue: string[] } {
  if (!queue.length) {
    return { nextQuestionId: null, nextQueue: [] }
  }
  const randomIndex = Math.floor(Math.random() * queue.length)
  const selectedId = queue[randomIndex]
  return {
    nextQuestionId: selectedId,
    nextQueue: [...queue.slice(0, randomIndex), ...queue.slice(randomIndex + 1)]
  }
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
  const [allQuestions, setAllQuestions] = useState<NormalizedQuestionUnion[]>([])
  const [reviewQueue, setReviewQueue] = useState<string[]>([])
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [doneQuestionIds, setDoneQuestionIds] = useState<string[]>([])
  const [reviewFinalCorrect, setReviewFinalCorrect] = useState<Record<string, boolean>>({})

  const prevModeRef = useRef<LearnMode | null>(null)
  const prevChapterRef = useRef<ChapterId>(selectedChapter)

  useEffect(() => {
    const shouldLoad =
      prevModeRef.current === null ||
      prevModeRef.current === 'mixed_review' ||
      prevChapterRef.current !== selectedChapter

    prevChapterRef.current = selectedChapter
    prevModeRef.current = mode

    if (mode === 'mixed_review') {
      return
    }

    if (!shouldLoad) {
      return
    }

    let isActive = true
    const now = Date.now()
    setQuestions([])
    setAnswers({})
    setWrongQuestionIds([])
    setTextSubmittedQuestionIds([])
    setIsSubmitted(false)
    setScore(0)
    setError(null)
    setStartedAt(now)
    setNowTick(now)
    setIsReadyToSave(false)
    setLoading(true)

    loadQuestions(selectedChapter)
      .then((data) => {
        if (!isActive) {
          return
        }
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
  }, [selectedChapter, mode])

  useEffect(() => {
    if (mode !== 'mixed_review') {
      return
    }

    let isActive = true
    const now = Date.now()
    setQuestions([])
    setAllQuestions([])
    setReviewQueue([])
    setCurrentQuestionId(null)
    setAttempts({})
    setDoneQuestionIds([])
    setReviewFinalCorrect({})
    setAnswers({})
    setTextSubmittedQuestionIds([])
    setIsSubmitted(false)
    setScore(0)
    setError(null)
    setStartedAt(now)
    setNowTick(now)
    setIsReadyToSave(false)
    setLoading(true)

    loadAllQuestions()
      .then((data) => {
        if (!isActive) {
          return
        }

        const allIds = data.map((item) => item.id)
        const saved = loadAllReviewProgress()
        setQuestions(data)
        setAllQuestions(data)

        if (!saved || !saved.allQuestionIds.length) {
          const initialQueue = shuffleIds(allIds)
          const { nextQuestionId, nextQueue } = getNextQuestionIdFromQueue(initialQueue)
          setReviewQueue(nextQueue)
          setCurrentQuestionId(nextQuestionId)
          setIsReadyToSave(true)
          setLoading(false)
          return
        }

        const availableSet = new Set(allIds)
        const filteredQueue = Array.isArray(saved.reviewQueue)
          ? saved.reviewQueue.filter((id: string) => availableSet.has(id))
          : []
        const filteredDoneIds = Array.isArray(saved.doneQuestionIds)
          ? saved.doneQuestionIds.filter((id: string) => availableSet.has(id))
          : []
        const filteredAttempts =
          saved.attempts && typeof saved.attempts === 'object'
            ? Object.fromEntries(
                Object.entries(saved.attempts).filter(([id]) => availableSet.has(id))
              )
            : {}
        const filteredFinalCorrect =
          saved.reviewFinalCorrect && typeof saved.reviewFinalCorrect === 'object'
            ? Object.fromEntries(
                Object.entries(saved.reviewFinalCorrect).filter(([id]) => availableSet.has(id))
              )
            : {}
        const filteredTextSubmitted = Array.isArray(saved.textSubmittedQuestionIds)
          ? saved.textSubmittedQuestionIds.filter((id: string) => availableSet.has(id))
          : []
        const filteredAnswers: Record<string, QuestionAnswer> = {}
        const savedAnswers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {}
        data.forEach((question) => {
          if (Object.prototype.hasOwnProperty.call(savedAnswers, question.id)) {
            filteredAnswers[question.id] = savedAnswers[question.id] as QuestionAnswer
          }
        })

        const currentInProgress = availableSet.has(saved.currentQuestionId || '')
          ? saved.currentQuestionId
          : null

        let nextQuestionId = currentInProgress
        let nextQueue = filteredQueue
        if (!nextQuestionId) {
          const drawn = getNextQuestionIdFromQueue(nextQueue)
          nextQuestionId = drawn.nextQuestionId
          nextQueue = drawn.nextQueue
        }

        setReviewQueue(nextQueue)
        setCurrentQuestionId(nextQuestionId)
        setAttempts(filteredAttempts)
        setDoneQuestionIds(filteredDoneIds)
        setReviewFinalCorrect(filteredFinalCorrect)
        setAnswers(filteredAnswers)
        setTextSubmittedQuestionIds(filteredTextSubmitted)
        setStartedAt(
          Number.isFinite(saved.startedAt) && saved.startedAt > 0 ? saved.startedAt : now
        )

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
  }, [mode])

  useEffect(() => {
    if (mode === 'exam' && !isSubmitted) {
      return
    }
    if (mode === 'mixed_review') {
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
    if (mode === 'mixed_review' && currentQuestionId) {
      return questions.filter((question) => question.id === currentQuestionId)
    }
    if (mode === 'mixed_review') {
      return []
    }
    return questions
  }, [questions, mode, wrongQuestionIds, currentQuestionId])

  const textSubmittedSet = useMemo(() => new Set(textSubmittedQuestionIds), [textSubmittedQuestionIds])

  const visibleQuestionSet = useMemo(() => {
    return new Set(visibleQuestions.map((question) => question.id))
  }, [visibleQuestions])

  const questionMap = useMemo(() => {
    return new Map(questions.map((question) => [question.id, question]))
  }, [questions])

  const answeredCount = useMemo(() => {
    if (mode === 'mixed_review' && currentQuestionId) {
      const current = questionMap.get(currentQuestionId)
      if (!current) {
        return 0
      }
      return hasAnswered(current, answers[current.id]) ? 1 : 0
    }
    return visibleQuestions.filter((question) => hasAnswered(question, answers[question.id])).length
  }, [visibleQuestions, answers, mode, currentQuestionId, questionMap])

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
    if (mode === 'mixed_review') {
      return Object.values(reviewFinalCorrect).filter(Boolean).length
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
  }, [questionMap, visibleResults, mode, textSubmittedSet, reviewFinalCorrect])

  const canSubmit = useMemo(() => {
    if (mode !== 'mixed_review') {
      return visibleQuestions.length > 0 && answeredCount === visibleQuestions.length
    }
    const current = currentQuestionId ? questionMap.get(currentQuestionId) : null
    if (!current) {
      return false
    }
    if (!hasAnswered(current, answers[current.id])) {
      return false
    }
    if (current.type === 'text_answer' && !textSubmittedSet.has(current.id)) {
      return false
    }
    return true
  }, [visibleQuestions.length, answeredCount, mode, currentQuestionId, questionMap, answers, textSubmittedSet])

  const currentQuestionCount = mode === 'mixed_review' ? allQuestions.length : visibleQuestions.length

  const progressPercent = currentQuestionCount === 0
    ? 0
    : mode === 'mixed_review'
      ? Math.round((doneQuestionIds.length / currentQuestionCount) * 100)
      : Math.round((answeredCount / currentQuestionCount) * 100)

  const accuracyPercent = currentQuestionCount === 0
    ? 0
    : mode === 'mixed_review'
      ? Math.round((correctCount / Math.max(doneQuestionIds.length, 1)) * 100)
      : Math.round((correctCount / currentQuestionCount) * 100)

  useEffect(() => {
    if (!isReadyToSave) return
    if (mode === 'mixed_review') {
      if (!allQuestions.length) return
      saveAllReviewProgress({
        answers,
        startedAt,
        lastRunAt: Date.now(),
        allQuestionIds: allQuestions.map((question) => question.id),
        reviewQueue,
        currentQuestionId,
        attempts,
        doneQuestionIds,
        reviewFinalCorrect,
        textSubmittedQuestionIds
      })
      return
    }
    if (!questions.length) return
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
  }, [answers, isSubmitted, score, startedAt, mode, wrongQuestionIds, textSubmittedQuestionIds, isReadyToSave, questions.length, selectedChapter, allQuestions.length, reviewQueue, currentQuestionId, attempts, doneQuestionIds, reviewFinalCorrect])

  function handleSingleChoice(questionId: string, value: string) {
    if ((mode === 'exam' && isSubmitted) || (mode === 'mixed_review' && !currentQuestionId)) {
      return
    }
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleTextAnswer(questionId: string, value: string) {
    if ((mode === 'exam' && isSubmitted) || (mode === 'mixed_review' && !currentQuestionId)) {
      return
    }
    setTextSubmittedQuestionIds((prev) => prev.filter((id) => id !== questionId))
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleMatchingAnswer(questionId: string, number: string, value: string) {
    if ((mode === 'exam' && isSubmitted) || (mode === 'mixed_review' && !currentQuestionId)) {
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
    if (isSubmitted && mode === 'exam') return
    if (mode === 'exam') {
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
      return
    }

    if (mode !== 'mixed_review') {
      return
    }

    if (!currentQuestionId || !canSubmit) {
      return
    }

    const current = questionMap.get(currentQuestionId)
    if (!current) {
      return
    }

    const currentResult = gradeQuestion(current, answers[currentQuestionId])
    const previousAttempt = attempts[currentQuestionId] ?? 0
    const shouldRetry = !currentResult.isCorrect && previousAttempt === 0

    setAttempts((prev) => {
      if (!shouldRetry) {
        return prev
      }
      return { ...prev, [currentQuestionId]: 1 }
    })
    setReviewFinalCorrect((prev) => ({ ...prev, [currentQuestionId]: currentResult.isCorrect }))
    setDoneQuestionIds((prev) => (prev.includes(currentQuestionId) ? prev : [...prev, currentQuestionId]))

    setReviewQueue((prevQueue) => {
      const nextQueue = [...prevQueue]
      if (shouldRetry) {
        const randomIndex = Math.floor(Math.random() * (nextQueue.length + 1))
        nextQueue.splice(randomIndex, 0, currentQuestionId)
      }

      const { nextQuestionId, nextQueue: afterPopQueue } = getNextQuestionIdFromQueue(nextQueue)
      setCurrentQuestionId(nextQuestionId)
      setTextSubmittedQuestionIds((prev) => prev.filter((id) => id !== currentQuestionId))
      return afterPopQueue
    })
  }

  function handleResetAnswers() {
    if (mode === 'mixed_review') {
      clearAllReviewProgress()
      setAnswers({})
      setTextSubmittedQuestionIds([])
      setAttempts({})
      setDoneQuestionIds([])
      setReviewFinalCorrect({})
      setCurrentQuestionId(null)
      setReviewQueue([])
      setStartedAt(Date.now())
      setNowTick(Date.now())
      const allIds = allQuestions.map((question) => question.id)
      const initialQueue = shuffleIds(allIds)
      const { nextQuestionId, nextQueue } = getNextQuestionIdFromQueue(initialQueue)
      setReviewQueue(nextQueue)
      setCurrentQuestionId(nextQuestionId)
      return
    }

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
    if (mode === 'mixed_review' && next !== 'mixed_review') {
      setAllQuestions([])
    }
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
    if (label === 'mistakes') return en.app.modeLabel.mistakes
    return en.app.modeLabel.mixedReview
  }

  function getModeHint() {
    if (mode === 'exam') {
      return canSubmit ? en.app.modeHint.examReady : en.app.modeHint.examIncomplete
    }
    if (mode === 'practice') {
      return en.app.modeHint.practice
    }
    if (mode === 'mixed_review') {
      if (!questions.length) {
        return en.mixedReview.noProgress
      }
      if (doneQuestionIds.length === allQuestions.length) {
        return en.mixedReview.resetHint
      }
      return en.app.modeHint.mixedReviewStatus(
        doneQuestionIds.length,
        allQuestions.length,
        reviewQueue.length
      )
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
          <p>{mode === 'mixed_review' ? en.app.loadingDescription(en.app.status.chapterAllLabel) : en.app.loadingDescription(selectedChapter)}</p>
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

  const isMixedReviewComplete = mode === 'mixed_review' && !reviewQueue.length && !currentQuestionId
  const lockInput = (mode === 'exam' && isSubmitted) || isMixedReviewComplete
  const activeSubmitText = mode === 'exam'
    ? isSubmitted
      ? en.app.status.submit.submitted
      : `${en.app.status.submit.submitLabel} ${answeredCount}/${currentQuestionCount}`
    : mode === 'mixed_review'
      ? en.app.status.submit.mixedReviewSubmit
      : en.app.status.submit.practiceModeLabel

  return (
    <main className="app">
      <header className="topbar card">
        <div className="topbar-main">
          <div>
            <p className="eyebrow">{en.app.eyebrow}</p>
            <h1>{mode === 'mixed_review' ? en.app.status.chapterAllLabel : questions[0]?.chapter || `${toDisplayChapter(selectedChapter)}`}</h1>
            <p className="subtitle">{getModeLabel(mode)}</p>
          </div>
          {mode !== 'mixed_review' ? (
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
          ) : null}
          <div className="mode-stats">
            <div className="mode-stat">
              <span>{en.app.status.stats.progress}</span>
              <strong>
                {mode === 'mixed_review' ? doneQuestionIds.length : answeredCount}/{currentQuestionCount}
              </strong>
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
                  {mode === 'mixed_review'
                    ? `${correctCount}/${doneQuestionIds.length} (${accuracyPercent}%)`
                    : `${correctCount}/${currentQuestionCount} (${accuracyPercent}%)`}
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
          <button
            type="button"
            className={mode === 'mixed_review' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => handleModeChange('mixed_review')}
          >
            {en.app.modeLabel.mixedReview}
          </button>
        </div>

        <div className="progress-wrap">
          <div className="progress-meta">
            <span>
              {mode === 'exam'
                ? en.app.status.progressMetaExam
                : mode === 'mixed_review'
                  ? en.app.status.progressMetaMixedReview
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
        ) : mode === 'mixed_review' && isMixedReviewComplete ? (
          <section className="status-card">
            <h2>{en.mixedReview.sessionTitle}</h2>
            <p>{en.mixedReview.resetHint}</p>
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
                      : mode === 'mixed_review'
                        ? doneQuestionIds.includes(question.id)
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

            {mode === 'exam' || mode === 'mixed_review' ? (
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
          answeredCount={mode === 'mixed_review' ? doneQuestionIds.length : answeredCount}
          onReset={handleResetAnswers}
        />

        <div className="extra-actions">
          <button type="button" className="ghost-btn" onClick={handleResetAnswers}>
            {en.app.status.buttons.clearAnswers}
          </button>
          {mode !== 'mixed_review' ? (
            <button type="button" className="ghost-btn" onClick={handleClearWrongHistory}>
              {en.app.status.buttons.clearWrongHistory}
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
