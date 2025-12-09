function formatTime(ms) {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function ProgressPanel({ phase, completedTests, totalTests, elapsedTime, totalTokens }) {
  const progress = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  const totalTokenCount = totalTokens.prompt + totalTokens.completion;

  return (
    <div className="panel">
      <div className="panel-header">Progress</div>

      <div className="progress-panel">
        <div className="progress-stat">
          <div className="progress-stat-value">
            {completedTests}/{totalTests}
          </div>
          <div className="progress-stat-label">Tests Completed</div>
        </div>

        <div className="progress-stat">
          <div className="progress-stat-value">{formatTime(elapsedTime)}</div>
          <div className="progress-stat-label">Elapsed Time</div>
        </div>

        <div className="progress-stat">
          <div className="progress-stat-value">{formatNumber(totalTokenCount)}</div>
          <div className="progress-stat-label">
            Tokens (P: {formatNumber(totalTokens.prompt)} / C: {formatNumber(totalTokens.completion)}
            {totalTokens.reasoning > 0 && ` / R: ${formatNumber(totalTokens.reasoning)}`})
          </div>
        </div>

        <div className="progress-stat">
          <div className="progress-stat-value" style={{ textTransform: 'capitalize' }}>
            {phase}
          </div>
          <div className="progress-stat-label">Status</div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default ProgressPanel;
