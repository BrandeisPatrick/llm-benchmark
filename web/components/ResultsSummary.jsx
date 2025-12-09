function formatDuration(ms) {
  if (!ms) return '0s';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function ResultsSummary({ results, availableModels }) {
  const handleExportJSON = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      results,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  let totalFirstTry = 0;
  let totalFixed = 0;
  let totalFailed = 0;

  Object.values(results).forEach((r) => {
    totalFirstTry += r.passedFirstTry;
    totalFixed += r.passedAfterLoop;
    totalFailed += r.totalFailed;
  });

  const totalTests = totalFirstTry + totalFixed + totalFailed;
  const firstTryRate = totalTests > 0 ? ((totalFirstTry / totalTests) * 100).toFixed(1) : 0;
  const successRate = totalTests > 0 ? (((totalFirstTry + totalFixed) / totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="panel">
      <div className="panel-header">Results Summary</div>

      {/* Analysis */}
      <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)' }}>{successRate}%</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Overall Success Rate</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>{firstTryRate}%</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>First-Try Success</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--warning)' }}>{totalFixed}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fixed by Validation Loop</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--error)' }}>{totalFailed}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Failed</div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <table className="results-table">
        <thead>
          <tr>
            <th>Model</th>
            <th className="num">1st Try</th>
            <th className="num">Fixed</th>
            <th className="num">Failed</th>
            <th className="num">Avg Time</th>
            <th className="num">Tokens (P/C/R)</th>
          </tr>
        </thead>
        <tbody>
          {availableModels.map((model) => {
            const r = results[model.id];
            if (!r) return null;

            const testCount = r.tests.length || 1;
            const avgTime = r.totalDuration / testCount;

            return (
              <tr key={model.id}>
                <td>{r.name}</td>
                <td className="num" style={{ color: 'var(--success)' }}>
                  {r.passedFirstTry}
                </td>
                <td className="num" style={{ color: 'var(--warning)' }}>
                  {r.passedAfterLoop}
                </td>
                <td className="num" style={{ color: 'var(--error)' }}>
                  {r.totalFailed}
                </td>
                <td className="num">{formatDuration(avgTime)}</td>
                <td className="num">
                  {formatNumber(r.totalTokens.prompt)}/{formatNumber(r.totalTokens.completion)}
                  {r.totalTokens.reasoning > 0 && `/${formatNumber(r.totalTokens.reasoning)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Actions */}
      <div className="results-actions">
        <button className="btn btn-primary" onClick={handleExportJSON}>
          Export JSON
        </button>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Run Again
        </button>
      </div>
    </div>
  );
}

export default ResultsSummary;
