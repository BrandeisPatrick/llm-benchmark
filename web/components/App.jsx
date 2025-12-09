import { useState, useEffect } from 'preact/hooks';
import { ApiKeyForm } from './ApiKeyForm.jsx';
import { ModelSelector } from './ModelSelector.jsx';
import { TestConfig } from './TestConfig.jsx';
import { Dashboard } from './Dashboard.jsx';
import { ResultsSummary } from './ResultsSummary.jsx';
import { getState, subscribe, setState } from '../lib/store.js';
import { setApiKey } from '../lib/llmClient.js';
import { runBenchmark, getTestCases, getSelectedModels, cancelBenchmark } from '../lib/runner.js';

export function App() {
  const [state, setLocalState] = useState(getState());

  useEffect(() => {
    return subscribe((newState) => setLocalState({ ...newState }));
  }, []);

  // Update elapsed time while running
  useEffect(() => {
    if (!state.isRunning || !state.startTime) return;

    const interval = setInterval(() => {
      setState({ elapsedTime: Date.now() - state.startTime });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRunning, state.startTime]);

  const handleStartBenchmark = async () => {
    const models = getSelectedModels(state.selectedModels);
    const testCases = getTestCases(state.testSuite);

    if (models.length === 0) {
      alert('Please select at least one model');
      return;
    }

    if (!state.apiKeyValid) {
      alert('Please enter and test your API key first');
      return;
    }

    try {
      await runBenchmark({
        models,
        testCases,
        maxIterations: state.maxIterations,
      });
    } catch (error) {
      if (error.message !== 'Benchmark cancelled') {
        console.error('Benchmark failed:', error);
        alert(`Benchmark failed: ${error.message}`);
      }
    }
  };

  const handleStopBenchmark = () => {
    cancelBenchmark();
  };

  const handleApiKeyChange = (key, valid) => {
    setApiKey(key);
    setState({ apiKey: key, apiKeyValid: valid });
  };

  const canStart = state.apiKeyValid && state.selectedModels.length > 0 && !state.isRunning;

  return (
    <div>
      <header className="header">
        <h1>LLM Benchmark Dashboard</h1>
        <div className="header-status">
          {state.isRunning && (
            <>
              <span className="model-card-status running" />
              <span>Running...</span>
            </>
          )}
          {state.phase === 'complete' && (
            <>
              <span className="model-card-status complete" />
              <span>Complete</span>
            </>
          )}
        </div>
      </header>

      <div className="main-layout">
        <aside className="config-panel panel">
          <div className="panel-header">Configuration</div>

          <ApiKeyForm
            apiKey={state.apiKey}
            apiKeyValid={state.apiKeyValid}
            onApiKeyChange={handleApiKeyChange}
            disabled={state.isRunning}
          />

          <ModelSelector
            selectedModels={state.selectedModels}
            onSelectionChange={(models) => setState({ selectedModels: models })}
            disabled={state.isRunning}
          />

          <TestConfig
            testSuite={state.testSuite}
            maxIterations={state.maxIterations}
            onTestSuiteChange={(suite) => setState({ testSuite: suite })}
            onMaxIterationsChange={(n) => setState({ maxIterations: n })}
            disabled={state.isRunning}
          />

          {state.isRunning ? (
            <button className="btn btn-stop btn-full" onClick={handleStopBenchmark}>
              Stop Benchmark
            </button>
          ) : (
            <button className="btn btn-start btn-full" onClick={handleStartBenchmark} disabled={!canStart}>
              Start Benchmark
            </button>
          )}
        </aside>

        <main className="dashboard">
          {state.phase === 'complete' && state.results ? (
            <ResultsSummary results={state.results} availableModels={state.availableModels} />
          ) : (
            <Dashboard
              phase={state.phase}
              completedTests={state.completedTests}
              totalTests={state.totalTests}
              elapsedTime={state.elapsedTime}
              totalTokens={state.totalTokens}
              modelStatus={state.modelStatus}
              availableModels={state.availableModels}
              logs={state.logs}
              maxIterations={state.maxIterations}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
