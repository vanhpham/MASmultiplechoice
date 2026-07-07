import type { QuestionAnswer } from '../types/question'

export interface QuizPersist {
  chapter: string
  answers: Record<string, QuestionAnswer>
  isSubmitted: boolean
  score: number | null
  startedAt: number
  lastRunAt: number
  mode: 'exam' | 'practice' | 'mistakes' | 'mixed_review'
  wrongQuestionIds: string[]
  textSubmittedQuestionIds: string[]
}

const CURRENT_KEY_PREFIX = 'mas-mc'
const LEGACY_KEY = 'mas-mc-chap2-progress'

function toStorageKey(chapter: string) {
  return `${CURRENT_KEY_PREFIX}-${chapter}-progress`
}

export function loadProgress(chapter: string): QuizPersist | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const primary = window.localStorage.getItem(toStorageKey(chapter))
    const fallback = primary ?? (chapter === 'chap2' ? window.localStorage.getItem(LEGACY_KEY) : null)
    const raw = primary ?? fallback
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
      chapter: parsed.chapter ?? chapter,
      answers: parsed.answers ?? {},
      isSubmitted: Boolean(parsed.isSubmitted),
      score: typeof parsed.score === 'number' ? parsed.score : null,
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
      lastRunAt: typeof parsed.lastRunAt === 'number' ? parsed.lastRunAt : Date.now(),
      mode: parsed.mode === 'mistakes' || parsed.mode === 'practice' || parsed.mode === 'exam' || parsed.mode === 'mixed_review' ? parsed.mode : 'exam',
      wrongQuestionIds: Array.isArray(parsed.wrongQuestionIds) ? parsed.wrongQuestionIds : [],
      textSubmittedQuestionIds: Array.isArray(parsed.textSubmittedQuestionIds)
        ? parsed.textSubmittedQuestionIds
        : []
    } as QuizPersist
  } catch {
    return null
  }
}

export function saveProgress(chapter: string, data: QuizPersist): void {
  if (typeof window === 'undefined') {
    return
  }
  const payload: QuizPersist = {
    ...data,
    chapter
  }
  window.localStorage.setItem(toStorageKey(chapter), JSON.stringify(payload))
  if (chapter !== 'chap2') {
    return
  }
  window.localStorage.removeItem(LEGACY_KEY)
}

export interface MixedReviewPersist {
  startedAt: number
  lastRunAt: number
  allQuestionIds: string[]
  reviewQueue: string[]
  currentQuestionId: string | null
  attempts: Record<string, number>
  doneQuestionIds: string[]
  reviewFinalCorrect: Record<string, boolean>
  answers: Record<string, QuestionAnswer>
  textSubmittedQuestionIds: string[]
}

const ALL_REVIEW_KEY = `${CURRENT_KEY_PREFIX}-all-chapters-review-progress`

export function loadAllReviewProgress(): MixedReviewPersist | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(ALL_REVIEW_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return {
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
      lastRunAt: typeof parsed.lastRunAt === 'number' ? parsed.lastRunAt : Date.now(),
      allQuestionIds: Array.isArray(parsed.allQuestionIds) ? parsed.allQuestionIds : [],
      reviewQueue: Array.isArray(parsed.reviewQueue) ? parsed.reviewQueue : [],
      currentQuestionId: typeof parsed.currentQuestionId === 'string' ? parsed.currentQuestionId : null,
      attempts: parsed.attempts && typeof parsed.attempts === 'object' ? parsed.attempts : {},
      doneQuestionIds: Array.isArray(parsed.doneQuestionIds) ? parsed.doneQuestionIds : [],
      reviewFinalCorrect:
        parsed.reviewFinalCorrect && typeof parsed.reviewFinalCorrect === 'object'
          ? parsed.reviewFinalCorrect
          : {},
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      textSubmittedQuestionIds: Array.isArray(parsed.textSubmittedQuestionIds)
        ? parsed.textSubmittedQuestionIds
        : []
    }
  } catch {
    return null
  }
}

export function saveAllReviewProgress(data: MixedReviewPersist): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(ALL_REVIEW_KEY, JSON.stringify(data))
}

export function clearAllReviewProgress(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(ALL_REVIEW_KEY)
}

export function clearProgress(chapter: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(toStorageKey(chapter))
  if (chapter === 'chap2') {
    window.localStorage.removeItem(LEGACY_KEY)
  }
}
