import { useState } from 'preact/hooks';
import { testApiKey } from '../lib/llmClient.js';

export function ApiKeyForm({ apiKey, apiKeyValid, onApiKeyChange, disabled }) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [inputValue, setInputValue] = useState(apiKey || '');

  const handleTest = async () => {
    if (!inputValue.trim()) return;

    setTesting(true);
    const result = await testApiKey(inputValue.trim());
    setTesting(false);

    onApiKeyChange(inputValue.trim(), result.valid);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    // Reset validation when input changes
    if (apiKeyValid !== null) {
      onApiKeyChange(e.target.value, null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleTest();
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">OpenAI API Key</label>
      <div className="input-with-button">
        <input
          type={showKey ? 'text' : 'password'}
          className="form-input"
          placeholder="sk-..."
          value={inputValue}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowKey(!showKey)}
          title={showKey ? 'Hide' : 'Show'}
        >
          {showKey ? '🙈' : '👁️'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleTest}
          disabled={!inputValue.trim() || testing || disabled}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>

        {apiKeyValid === true && <span className="status-badge valid">Valid</span>}

        {apiKeyValid === false && <span className="status-badge invalid">Invalid</span>}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
        Key is stored in memory only and cleared on page refresh.
      </p>
    </div>
  );
}

export default ApiKeyForm;
