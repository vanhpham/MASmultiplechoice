export type QuestionType = 'single_choice' | 'text_answer' | 'matching_matrix'

export interface RawQuestion {
  chapter: string
  source_page: number
  question_number: string
  question: string
  type: QuestionType
  options?: string[]
  columns?: string[]
  answer: | string
    | MatchingAnswerItem[]
    | MatchingLegacyAnswerItem[]
    | MatchingBlankAnswerItem[]
    | MatchingLabelAnswerItem[]
  manual_image_needed: boolean
  note?: string
}

export interface MatchingLegacyAnswerItem {
  component: string
  state: string
}

export interface MatchingLabelAnswerItem {
  item: string
  label: string
}

export interface MatchingBlankAnswerItem {
  blank: string
  word: string
}

export interface MatchingAnswerItem {
  number: string
  component: string
}

export interface BaseQuestion {
  chapter: string
  source_page: number
  question_number: string
  question: string
  type: QuestionType
  manual_image_needed: boolean
  note?: string
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single_choice'
  options: string[]
  answer: string
}

export interface TextAnswerQuestion extends BaseQuestion {
  type: 'text_answer'
  answer: string
}

export interface MatchingMatrixQuestion extends BaseQuestion {
  type: 'matching_matrix'
  columns: string[]
  answer: MatchingAnswerItem[]
}

export type Question = SingleChoiceQuestion | TextAnswerQuestion | MatchingMatrixQuestion

export interface NormalizedQuestion extends Omit<Question, 'answer'> {
  id: string
  image: string | null
}

export interface NormalizedSingleChoice extends Omit<SingleChoiceQuestion, 'answer'> {
  id: string
  image: string | null
  answer: string
}

export interface NormalizedTextAnswer extends Omit<TextAnswerQuestion, 'answer'> {
  id: string
  image: string | null
  answer: string
}

export interface NormalizedMatchingMatrix extends Omit<MatchingMatrixQuestion, 'answer'> {
  id: string
  image: string | null
  answer: MatchingAnswerItem[]
}

export type NormalizedQuestionUnion = NormalizedSingleChoice | NormalizedTextAnswer | NormalizedMatchingMatrix

export type QuestionAnswer = string | Record<string, string>

export interface QuestionResult {
  id: string
  isCorrect: boolean
  userAnswer: QuestionAnswer
  correctAnswer: string
}
