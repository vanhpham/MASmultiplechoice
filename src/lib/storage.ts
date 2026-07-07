import type { QuestionAnswer } from '../types/question'

export interface QuizPersist {
  chapter: string
  answers: Record<string, QuestionAnswer>
  isSubmitted: boolean
  score: number | null
  startedAt: number
  lastRunAt: number
  mode: 'exam' | 'practice' | 'mistakes'
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
      mode: parsed.mode === 'mistakes' || parsed.mode === 'practice' || parsed.mode === 'exam' ? parsed.mode : 'exam',
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

export function clearProgress(chapter: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(toStorageKey(chapter))
  if (chapter === 'chap2') {
    window.localStorage.removeItem(LEGACY_KEY)
  }
}
