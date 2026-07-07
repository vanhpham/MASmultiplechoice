import type { NormalizedQuestionUnion, RawQuestion } from '../types/question'
import { slugify } from '../lib/normalize'

export async function loadQuestions(): Promise<NormalizedQuestionUnion[]> {
  const response = await fetch('/data/chap2.json')
  if (!response.ok) {
    throw new Error(`Không tải được dữ liệu câu hỏi (${response.status} ${response.statusText})`)
  }
  const json = (await response.json()) as RawQuestion[]
  return json.map((q) => normalizeQuestion(q))
}

function normalizeQuestion(question: RawQuestion): NormalizedQuestionUnion {
  const id = `${slugify(question.chapter)}-q${String(question.question_number).padStart(2, '0')}`
  const image = question.manual_image_needed ? `/images/chap2/q${question.question_number}.png` : null

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
    answer: question.answer as Array<{ number: string; component: string }>
  }
}
