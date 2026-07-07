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
        <h3>Kết quả phiên</h3>
        <p>Nhấn “Làm lại” để bắt đầu từ đầu</p>
      </div>
      <div className="result-grid">
        <div>
          <p className="label">Tổng câu</p>
          <strong>{totalQuestions}</strong>
        </div>
        <div>
          <p className="label">Đã trả lời</p>
          <strong>{answeredCount}</strong>
        </div>
        <div>
          <p className="label">Điểm</p>
          <strong>
            {correctAnswers}/{totalQuestions}
          </strong>
        </div>
        <div>
          <p className="label">Thời gian</p>
          <strong>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </strong>
        </div>
      </div>
      <button type="button" className="reset-btn" onClick={onReset}>
        Làm lại
      </button>
    </section>
  )
}
