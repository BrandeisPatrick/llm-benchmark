export function TestConfig({ testSuite, maxIterations, onTestSuiteChange, onMaxIterationsChange, disabled }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="form-group">
        <label className="form-label">Test Suite</label>
        <select
          className="form-select"
          value={testSuite}
          onChange={(e) => onTestSuiteChange(e.target.value)}
          disabled={disabled}
        >
          <option value="navigation">Navigation (3 tests)</option>
          <option value="all">All Tests</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Max Iterations</label>
        <input
          type="number"
          className="form-input form-number"
          min="1"
          max="5"
          value={maxIterations}
          onChange={(e) => onMaxIterationsChange(parseInt(e.target.value, 10) || 3)}
          disabled={disabled}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Max attempts to fix validation errors
        </p>
      </div>
    </div>
  );
}

export default TestConfig;
