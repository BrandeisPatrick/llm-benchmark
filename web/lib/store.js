/**
 * Simple reactive store for state management
 */

import { MODELS } from '../../src/config/models.js';

const initialState = {
  // Configuration
  apiKey: '',
  apiKeyValid: null, // null = untested, true = valid, false = invalid
  selectedModels: MODELS.slice(0, 3).map((m) => m.id), // Default: first 3 models
  testSuite: 'navigation',
  maxIterations: 3,

  // Runtime state
  phase: 'idle', // 'idle' | 'checking' | 'running' | 'complete'
  isRunning: false,
  availableModels: [],
  unavailableModels: [],

  // Progress tracking
  totalTests: 0,
  completedTests: 0,
  startTime: null,
  elapsedTime: 0,

  // Per-model status
  modelStatus: {},
  // Structure: { [modelId]: { currentTest, currentIteration, iterationHistory, status } }

  // Results
  results: null,
  logs: [],

  // Token usage
  totalTokens: {
    prompt: 0,
    completion: 0,
    reasoning: 0,
  },
};

let state = { ...initialState };
const listeners = new Set();

export function getState() {
  return state;
}

export function setState(updates) {
  state = { ...state, ...updates };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetState() {
  state = {
    ...initialState,
    apiKey: state.apiKey,
    apiKeyValid: state.apiKeyValid,
    selectedModels: state.selectedModels,
    testSuite: state.testSuite,
    maxIterations: state.maxIterations,
  };
  listeners.forEach((fn) => fn(state));
}

export function addLog(level, message, model = null) {
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date(),
    level,
    message,
    model,
  };
  setState({
    logs: [...state.logs, log].slice(-500), // Keep last 500 logs
  });
}

export function updateModelStatus(modelId, updates) {
  setState({
    modelStatus: {
      ...state.modelStatus,
      [modelId]: {
        ...state.modelStatus[modelId],
        ...updates,
      },
    },
  });
}

export function addTokens(prompt, completion, reasoning = 0) {
  setState({
    totalTokens: {
      prompt: state.totalTokens.prompt + prompt,
      completion: state.totalTokens.completion + completion,
      reasoning: state.totalTokens.reasoning + reasoning,
    },
  });
}

export default {
  getState,
  setState,
  subscribe,
  resetState,
  addLog,
  updateModelStatus,
  addTokens,
};
