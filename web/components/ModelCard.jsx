import { IterationHistory } from './IterationHistory.jsx';

export function ModelCard({ model, status, maxIterations }) {
  if (!status) {
    return (
      <div className="model-card">
        <div className="model-card-header">
          <span className="model-card-name">{model.name}</span>
          <span className="model-card-status" />
        </div>
        <div className="model-card-test">Waiting...</div>
      </div>
    );
  }

  const getStatusClass = () => {
    switch (status.status) {
      case 'running':
      case 'generating':
      case 'fixing':
        return 'running';
      case 'complete':
        return 'complete';
      case 'error':
        return 'error';
      default:
        return '';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'generating':
        return 'Generating...';
      case 'fixing':
        return 'Fixing errors...';
      case 'running':
        return 'Running...';
      case 'complete':
        return 'Complete';
      case 'waiting':
        return status.currentTest ? 'Waiting...' : 'Ready';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="model-card">
      <div className="model-card-header">
        <span className="model-card-name">{model.name}</span>
        <span className={`model-card-status ${getStatusClass()}`} />
      </div>

      {status.currentTest && <div className="model-card-test">{status.currentTest}</div>}

      {status.currentIteration > 0 && (
        <div className="model-card-iteration">
          Iteration {status.currentIteration}/{maxIterations}
        </div>
      )}

      {status.iterationHistory && status.iterationHistory.length > 0 && (
        <IterationHistory history={status.iterationHistory} maxIterations={maxIterations} />
      )}
    </div>
  );
}

export default ModelCard;
