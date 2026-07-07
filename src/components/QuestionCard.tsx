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

function getQuestionTypeLabel(type: NormalizedQuestionUnion['type']): string {
  if (type === 'single_choice') return 'Trắc nghiệm một đáp án'
  if (type === 'text_answer') return 'Điền từ khóa'
  return 'Khớp cột'
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
  const isEvaluated = !!result

  return (
    <article className="question-card" id={question.id}>
      <div className="question-meta">
        <div>
          <div className="chapter-name">{question.chapter}</div>
          <h2>Câu {question.question_number}</h2>
        </div>
        <span className="question-chip">{getQuestionTypeLabel(question.type)}</span>
      </div>
      {question.manual_image_needed ? <span className="manual-chip">Có hình</span> : null}

      <p className="question-text">{question.question}</p>

      {question.manual_image_needed ? (
        <ManualImage src={question.image} alt={`Hình câu ${question.question_number}`} />
      ) : null}

      <div className="question-body">
        {question.type === 'single_choice' ? (
          <div className="single-options">
            {question.options.map((option, index) => {
              const optionLabel = String.fromCharCode(65 + index)
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
                  <span className="option-index">{optionLabel}</span>
                  <span>{option}</span>
                  {selected ? <strong>✓</strong> : null}
                </button>
              )
            })}
          </div>
        ) : null}

        {question.type === 'text_answer' ? (
          <div className="text-question">
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
          <div className="matching-question-wrap">
            <MatchingQuestion
              question={question}
              answer={(answer as Record<string, string>) || {}}
              disabled={locked}
              onSelect={(number, value) => onMatching(question.id, number, value)}
              showResult={showResult}
            />
          </div>
        ) : null}
      </div>

      {showResult ? (
        <div className={`result-bar ${answerTextClass}`}>
          <div>{resultText}</div>
          {result ? <div>Đáp án đúng: {result.correctAnswer}</div> : null}
        </div>
      ) : null}
      {/* {question.note ? <div className="note">Gợi ý: {question.note}</div> : null} */}
      {question.type === 'text_answer' && showResult ? (
        <div className="question-feedback-inline">
          {result ? (
            <strong className={isEvaluated && result.isCorrect ? 'feedback-ok' : 'feedback-no'}>
              {result.isCorrect ? '✅ Chính xác' : '⚠️ Chưa đúng'}
            </strong>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
