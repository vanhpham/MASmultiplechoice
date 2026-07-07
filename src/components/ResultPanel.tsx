import { en } from '../i18n/en'

interface ResultPanelProps {
  totalQuestions: number
  correctAnswers: number
  elapsedSeconds: number
  answeredCount: number
  onReset: () => void
}

export function ResultPanel({
  totalQuestions,
  correctAnswers,
  elapsedSeconds,
  answeredCount,
  onReset
}: ResultPanelProps) {
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  return (
    <section className="result-panel card">
      <div className="result-panel-head">
        <h3>{en.resultPanel.title}</h3>
        <p>{en.resultPanel.resetHint}</p>
      </div>
      <div className="result-grid">
        <div>
          <p className="label">{en.resultPanel.label.total}</p>
          <strong>{totalQuestions}</strong>
        </div>
        <div>
          <p className="label">{en.resultPanel.label.answered}</p>
          <strong>{answeredCount}</strong>
        </div>
        <div>
          <p className="label">{en.resultPanel.label.score}</p>
          <strong>
            {correctAnswers}/{totalQuestions}
          </strong>
        </div>
        <div>
          <p className="label">{en.resultPanel.label.time}</p>
          <strong>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </strong>
        </div>
      </div>
      <button type="button" className="reset-btn" onClick={onReset}>
        {en.resultPanel.resetButton}
      </button>
    </section>
  )
}
