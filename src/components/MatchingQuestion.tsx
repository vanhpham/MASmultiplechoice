import { normalizeText } from '../lib/normalize'
import type { NormalizedMatchingMatrix } from '../types/question'

interface MatchingQuestionProps {
  question: NormalizedMatchingMatrix
  answer: Record<string, string>
  disabled: boolean
  onSelect: (number: string, value: string) => void
  showResult: boolean
}

function buildCorrectMap(question: NormalizedMatchingMatrix): Record<string, string> {
  return question.answer.reduce((acc, item) => {
    acc[item.number] = item.component
    return acc
  }, {} as Record<string, string>)
}

export function MatchingQuestion({
  question,
  answer,
  disabled,
  onSelect,
  showResult
}: MatchingQuestionProps) {
  const correctMap = buildCorrectMap(question)
  const itemNumbers = question.answer.map((item) => item.number)

  return (
    <div className="matching-grid">
      <div className="matching-header">
        <span>Mục số</span>
        <span>Chọn thành phần</span>
        {showResult ? <span>Kết quả</span> : null}
      </div>
      {itemNumbers.map((number) => {
        const selected = answer[number] ?? ''
        const isCorrect = selected && normalizeText(selected) === normalizeText(correctMap[number])

        return (
          <div className="matching-row" key={number}>
            <div className="cell number">{number}</div>
            <div className="cell">
              <select
                value={selected}
                disabled={disabled}
                onChange={(event) => onSelect(number, event.target.value)}
              >
                <option value="">-- Chưa chọn --</option>
                {question.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </div>
            {showResult ? <div className={`cell result ${isCorrect ? 'ok' : 'wrong'}`}>{isCorrect ? 'Đúng' : 'Sai'}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
