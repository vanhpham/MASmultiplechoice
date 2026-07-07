import type { NormalizedQuestionUnion, QuestionAnswer, QuestionResult } from '../types/question'
import { ManualImage } from './ManualImage'
import { MatchingQuestion } from './MatchingQuestion'
import { normalizeText } from '../lib/normalize'

interface QuestionCardProps {
  question: NormalizedQuestionUnion
  answer: QuestionAnswer
  showResult: boolean
  locked: boolean
  onSingleChoice: (id: string, value: string) => void
  onTextAnswer: (id: string, value: string) => void
  onMatching: (id: string, number: string, value: string) => void
  onTextSubmit?: (id: string) => void
  result?: QuestionResult
}

export function QuestionCard({
  question,
  answer,
  showResult,
  locked,
  onSingleChoice,
  onTextAnswer,
  onMatching,
  onTextSubmit,
  result
}: QuestionCardProps) {
  const resultText = result ? (result.isCorrect ? 'Bạn làm đúng' : 'Bạn làm sai') : ''
  const answerTextClass = result && (result.isCorrect ? 'result-correct' : 'result-wrong')

  return (
    <article className="question-card" id={question.id}>
      <div className="question-meta">
        <div>
          <div className="chapter-name">{question.chapter}</div>
          <h2>Câu {question.question_number}</h2>
        </div>
        {question.manual_image_needed ? <span className="manual-chip">Có hình</span> : null}
      </div>

      <p className="question-text">{question.question}</p>

      {question.manual_image_needed ? (
        <ManualImage src={question.image} alt={`Hình câu ${question.question_number}`} />
      ) : null}

      <div className="question-body">
        {question.type === 'single_choice' ? (
          <div className="single-options">
            {question.options.map((option) => {
              const selected = answer === option
              const normalizedCorrect = normalizeText(question.answer)
              const normalizedOption = normalizeText(option)
              const isCorrectOption = showResult && normalizedOption === normalizedCorrect
              const shouldHighlight = selected
                ? showResult
                  ? 'selected ' + (isCorrectOption ? 'result-correct' : 'result-wrong')
                  : 'selected'
                : ''
              return (
                <button
                  key={option}
                  type="button"
                  className={`option-btn ${shouldHighlight}`}
                  onClick={() => onSingleChoice(question.id, option)}
                  disabled={locked}
                >
                  <span>{option}</span>
                  {selected ? <strong>✓</strong> : null}
                </button>
              )
            })}
          </div>
        ) : null}

        {question.type === 'text_answer' ? (
          <div>
            <textarea
              className="text-answer"
              value={(answer as string) || ''}
              disabled={locked}
              placeholder="Nhập đáp án..."
              onChange={(event) => onTextAnswer(question.id, event.target.value)}
            />
            {onTextSubmit && (
              <button
                type="button"
                className="text-submit-btn"
                onClick={() => onTextSubmit(question.id)}
                disabled={locked || String(answer || '').trim() === ''}
              >
                Kiểm tra
              </button>
            )}
          </div>
        ) : null}

        {question.type === 'matching_matrix' ? (
          <MatchingQuestion
            question={question}
            answer={(answer as Record<string, string>) || {}}
            disabled={locked}
            onSelect={(number, value) => onMatching(question.id, number, value)}
            showResult={showResult}
          />
        ) : null}
      </div>

      {showResult ? (
        <div className={`result-bar ${answerTextClass}`}>
          <div>{resultText}</div>
          {result ? <div>Đáp án đúng: {result.correctAnswer}</div> : null}
        </div>
      ) : null}
      {question.note ? <div className="note">Gợi ý: {question.note}</div> : null}
    </article>
  )
}
