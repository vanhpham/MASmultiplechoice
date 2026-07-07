import { normalizeText } from '../lib/normalize'
import type { NormalizedMatchingMatrix } from '../types/question'
import { en } from '../i18n/en'

interface ClozeMatchingQuestionProps {
  question: NormalizedMatchingMatrix
  answer: Record<string, string>
  disabled: boolean
  onSelect: (number: string, value: string) => void
  showResult: boolean
}

function normalizeClozeText(value?: string): string {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') {
    return trimmed.slice(1, -1)
  }

  return value
}

function buildCorrectMap(question: NormalizedMatchingMatrix): Record<string, string> {
  return question.answer.reduce((acc, item) => {
    acc[item.number] = item.component
    return acc
  }, {} as Record<string, string>)
}

function extractParts(text: string): Array<{ type: 'text' | 'blank'; value: string }> {
  const tokens: Array<{ type: 'text' | 'blank'; value: string }> = []
  const pattern = /\(\d+\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    tokens.push({ type: 'blank', value: match[0] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

export function ClozeMatchingQuestion({
  question,
  answer,
  disabled,
  onSelect,
  showResult
}: ClozeMatchingQuestionProps) {
  const text = normalizeClozeText(question.cloze_text)
  const blankParts = extractParts(text)
  const correctMap = buildCorrectMap(question)
  const blankIds = Object.keys(correctMap)

  return (
    <div className="cloze-matching">
      <div className="cloze-text">
        {blankParts.map((part, index) => {
          if (part.type === 'text') {
            return (
              <span
                key={`text-${index}`}
                className="cloze-text-token"
              >
                {part.value}
              </span>
            )
          }

          if (!blankIds.includes(part.value)) {
            return (
              <span key={`blank-${index}`} className="cloze-blank">
                {part.value}
              </span>
            )
          }

          const selected = answer[part.value] || ''
          const isCorrect = selected !== '' && normalizeText(selected) === normalizeText(correctMap[part.value])
          return (
            <span key={`blank-${index}`} className="cloze-blank">
              <select
                value={selected}
                disabled={disabled}
                onChange={(event) => onSelect(part.value, event.target.value)}
              >
                <option value="">{en.matchingQuestion.optionNotSelected}</option>
                {question.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
              {showResult ? (
                <em className={`cloze-inline-result ${isCorrect ? 'ok' : 'wrong'}`}>
                  {selected ? (isCorrect ? en.matchingQuestion.correct : en.matchingQuestion.wrong) : en.matchingQuestion.wrong}
                </em>
              ) : null}
            </span>
          )
        })}
      </div>
    </div>
  )
}
