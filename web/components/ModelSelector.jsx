import { MODELS } from '../../src/config/models.js';

function getModelType(model) {
  if (model.id.startsWith('o1') || model.id.startsWith('o3') || model.id.startsWith('o4')) {
    return { label: 'Reasoning', className: 'reasoning' };
  }
  if (model.id.includes('gpt-5')) {
    return { label: 'GPT-5', className: 'gpt5' };
  }
  if (model.id.includes('codex')) {
    return { label: 'Codex', className: '' };
  }
  return null;
}

export function ModelSelector({ selectedModels, onSelectionChange, disabled }) {
  const handleToggle = (modelId) => {
    if (disabled) return;

    if (selectedModels.includes(modelId)) {
      onSelectionChange(selectedModels.filter((id) => id !== modelId));
    } else {
      onSelectionChange([...selectedModels, modelId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onSelectionChange(MODELS.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="form-group">
      <label className="form-label">Models ({selectedModels.length} selected)</label>

      <div className="model-actions">
        <button className="btn btn-secondary btn-sm" onClick={handleSelectAll} disabled={disabled}>
          All
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleDeselectAll} disabled={disabled}>
          None
        </button>
      </div>

      <div className="model-list">
        {MODELS.map((model) => {
          const modelType = getModelType(model);
          return (
            <div key={model.id} className="model-item" onClick={() => handleToggle(model.id)}>
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => {}}
                disabled={disabled}
              />
              <label>{model.name}</label>
              {modelType && <span className={`model-type-badge ${modelType.className}`}>{modelType.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ModelSelector;
