/**
 * Model Configuration
 * Defines available models and their timeout settings
 */

export const MODELS = [
  { name: 'GPT-5.1-codex', id: 'gpt-5.1-codex-mini' },
  { name: 'GPT-5-mini', id: 'gpt-5-mini' },
  { name: 'GPT-5-nano', id: 'gpt-5-nano' },
  { name: 'GPT-4.1', id: 'gpt-4.1' },
  { name: 'GPT-4.1-mini', id: 'gpt-4.1-mini' },
  { name: 'GPT-4.1-nano', id: 'gpt-4.1-nano' },
  { name: 'GPT-4o', id: 'gpt-4o' },
  { name: 'GPT-4o-mini', id: 'gpt-4o-mini' },
  { name: 'o1-mini', id: 'o1-mini' },
  { name: 'o3-mini', id: 'o3-mini' },
  { name: 'o4-mini', id: 'o4-mini' },
  { name: 'Codex-latest', id: 'codex-mini-latest' },
];

/**
 * Timeout configuration by model type
 */
export const TIMEOUT_CONFIG = {
  default: 120000, // 2 min for standard models
  reasoning: 300000, // 5 min for o1/o3/o4 reasoning models
  gpt5: 300000, // 5 min for GPT-5 models
  codex: 300000, // 5 min for codex models
};

/**
 * Get appropriate timeout for a model
 * @param {string} modelId - The model ID
 * @returns {number} Timeout in milliseconds
 */
export function getTimeout(modelId) {
  if (modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) {
    return TIMEOUT_CONFIG.reasoning;
  }
  if (modelId.includes('gpt-5')) {
    return TIMEOUT_CONFIG.gpt5;
  }
  if (modelId.includes('codex')) {
    return TIMEOUT_CONFIG.codex;
  }
  return TIMEOUT_CONFIG.default;
}

/**
 * Model tiers for easy selection
 */
export const MODEL_TIERS = {
  lite: {
    id: 'gpt-4o-mini',
    name: 'Lite',
    description: 'Fast & economical',
  },
  regular: {
    id: 'gpt-4.1-mini',
    name: 'Regular',
    description: 'Balanced performance',
  },
  pro: {
    id: 'gpt-4.1',
    name: 'Pro',
    description: 'Most capable',
  },
};

/**
 * Get models by tier
 * @param {string} tier - 'lite', 'regular', or 'pro'
 * @returns {Object} Model configuration
 */
export function getModelByTier(tier) {
  return MODEL_TIERS[tier] || MODEL_TIERS.regular;
}

/**
 * Filter models by name pattern
 * @param {string} pattern - Pattern to match (e.g., 'gpt-4', 'o3')
 * @returns {Array} Matching models
 */
export function filterModels(pattern) {
  const regex = new RegExp(pattern, 'i');
  return MODELS.filter((m) => regex.test(m.name) || regex.test(m.id));
}

export default {
  MODELS,
  TIMEOUT_CONFIG,
  MODEL_TIERS,
  getTimeout,
  getModelByTier,
  filterModels,
};
