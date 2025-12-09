import { ProgressPanel } from './ProgressPanel.jsx';
import { ModelCard } from './ModelCard.jsx';
import { LogStream } from './LogStream.jsx';

export function Dashboard({
  phase,
  completedTests,
  totalTests,
  elapsedTime,
  totalTokens,
  modelStatus,
  availableModels,
  logs,
  maxIterations,
}) {
  if (phase === 'idle') {
    return (
      <div className="panel">
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <h3>Ready to Benchmark</h3>
          <p>Enter your API key, select models, and click Start to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProgressPanel
        phase={phase}
        completedTests={completedTests}
        totalTests={totalTests}
        elapsedTime={elapsedTime}
        totalTokens={totalTokens}
      />

      {availableModels.length > 0 && (
        <div className="panel">
          <div className="panel-header">Model Status</div>
          <div className="model-cards-grid">
            {availableModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                status={modelStatus[model.id]}
                maxIterations={maxIterations}
              />
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">Live Log</div>
        <LogStream logs={logs} />
      </div>
    </>
  );
}

export default Dashboard;
