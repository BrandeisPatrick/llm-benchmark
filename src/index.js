/**
 * LLM Benchmark - Main Entry Point
 * Exports all public APIs for programmatic usage
 */

// Core modules
export { callLLM, extractContent } from './core/llmClient.js';
export { validateCode, validateJSX } from './core/validator.js';
export { runBenchmark, runTestWithLoop, checkModelAvailability } from './core/runner.js';

// Configuration
export { MODELS, TIMEOUT_CONFIG, MODEL_TIERS, getTimeout, getModelByTier, filterModels } from './config/models.js';

// Reporters
export {
  printHeader,
  printSectionHeader,
  printSummary,
  printAnalysis,
  printLoopEffectiveness,
  printAvailability,
  printIterationHistory,
  formatCheck,
} from './reporters/console.js';

// Default export with all modules
export default {
  // Core
  callLLM,
  extractContent,
  validateCode,
  validateJSX,
  runBenchmark,
  runTestWithLoop,
  checkModelAvailability,
  // Config
  MODELS,
  TIMEOUT_CONFIG,
  MODEL_TIERS,
  getTimeout,
  getModelByTier,
  filterModels,
  // Reporters
  printHeader,
  printSectionHeader,
  printSummary,
  printAnalysis,
  printLoopEffectiveness,
};
