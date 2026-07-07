import type {
  MatchingAnswerItem,
  MatchingLegacyAnswerItem,
  NormalizedQuestionUnion,
  RawQuestion
} from '../types/question'
import { slugify } from '../lib/normalize'

export const AVAILABLE_CHAPTERS = ['chap1', 'chap2', 'chap3', 'chap4', 'chap5', 'chap6', 'chap7', 'chap8', 'chap9', 'chap10', 'chap11'] as const
export type ChapterId = (typeof AVAILABLE_CHAPTERS)[number]

export function isChapterId(value: string): value is ChapterId {
  return (AVAILABLE_CHAPTERS as readonly string[]).includes(value)
}

export function toDisplayChapter(chapterId: ChapterId): string {
  const map: Record<ChapterId, string> = {
    chap1: 'Chapter 1',
    chap2: 'Chapter 2',
    chap3: 'Chapter 3',
    chap4: 'Chapter 4',
    chap5: 'Chapter 5',
    chap6: 'Chapter 6',
    chap7: 'Chapter 7',
    chap8: 'Chapter 8',
    chap9: 'Chapter 9',
    chap10: 'Chapter 10',
    chap11: 'Chapter 11'
  }
  return map[chapterId]
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function getDataUrls(chapterId: ChapterId): string[] {
  const base = ensureTrailingSlash(import.meta.env.BASE_URL ?? '/')
  const candidates = [
    `${base}data/${chapterId}.json`,
    `/data/${chapterId}.json`,
    `./data/${chapterId}.json`,
    `data/${chapterId}.json`
  ]
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return ['data/' + chapterId + '.json', './data/' + chapterId + '.json']
  }
  return Array.from(new Set(candidates))
}

async function loadQuestionsFromUrl(url: string, timeoutMs = 9000): Promise<RawQuestion[]> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Could not load data from ${url} (${response.status} ${response.statusText})`)
    }
    return (await response.json()) as RawQuestion[]
  } finally {
    window.clearTimeout(timeout)
  }
}

function normalizeMatchingAnswer(answer: Array<MatchingAnswerItem | MatchingLegacyAnswerItem>): MatchingAnswerItem[] {
  return answer
    .map((item) => {
      if ('number' in item && typeof item.number === 'string' && typeof item.component === 'string') {
        return { number: item.number.trim(), component: item.component.trim() }
      }

      if (
        'state' in item &&
        typeof item.state === 'string' &&
        typeof item.component === 'string'
      ) {
        return { number: item.component.trim(), component: item.state.trim() }
      }

      return null
    })
    .filter((item): item is MatchingAnswerItem => item !== null)
}

export async function loadQuestions(chapterId: ChapterId): Promise<NormalizedQuestionUnion[]> {
  const urls = getDataUrls(chapterId)
  let lastError: Error = new Error(`Could not load data of ${chapterId}.json`)

  for (const url of urls) {
    try {
      const json = await loadQuestionsFromUrl(url)
      return json.map((q) => normalizeQuestion(q, chapterId))
    } catch (error) {
      if (error instanceof Error) {
        lastError = error
      } else {
        lastError = new Error(`Unknown error while loading ${chapterId}.json from ${url}`)
      }
    }
  }

  throw new Error(
    `Could not load data of ${chapterId}.json. Tried: ${urls.join(', ')}. Last error: ${lastError.message}`
  )
}

export async function loadAllQuestions(): Promise<NormalizedQuestionUnion[]> {
  const allChapters = await Promise.all(AVAILABLE_CHAPTERS.map((chapterId) => loadQuestions(chapterId)))
  return allChapters.flat()
}

function normalizeQuestion(question: RawQuestion, chapterId: ChapterId): NormalizedQuestionUnion {
  const id = `${slugify(question.chapter)}-q${String(question.question_number).padStart(2, '0')}`
  const image = question.manual_image_needed
    ? `/images/${chapterId}/q${question.question_number}.png`
    : null

  if (question.type === 'single_choice') {
    return {
      ...question,
      id,
      image,
      type: 'single_choice',
      options: question.options ?? [],
      answer: question.answer as string
    }
  }

  if (question.type === 'text_answer') {
    return {
      ...question,
      id,
      image,
      type: 'text_answer',
      answer: question.answer as string
    }
  }

  return {
    ...question,
    id,
    image,
    type: 'matching_matrix',
    columns: question.columns ?? [],
    answer: Array.isArray(question.answer)
      ? normalizeMatchingAnswer(question.answer)
      : []
  }
}
