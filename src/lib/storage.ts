import type { QuestionAnswer } from '../types/question'

export interface QuizPersist {
  answers: Record<string, QuestionAnswer>
  isSubmitted: boolean
  score: number | null
  startedAt: number
  lastRunAt: number
  mode: 'exam' | 'practice' | 'mistakes'
  wrongQuestionIds: string[]
  textSubmittedQuestionIds: string[]
}

const STORAGE_KEY = 'mas-mc-chap2-progress'

export function loadProgress(): QuizPersist | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
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

export function saveProgress(data: QuizPersist): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearProgress(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(STORAGE_KEY)
}
