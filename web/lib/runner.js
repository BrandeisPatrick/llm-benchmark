/**
 * Browser-compatible Test Runner
 * Executes benchmarks with event emissions for live UI updates
 */

import { callLLM, extractContent } from './llmClient.js';
import { validateCode } from '../../src/core/validator.js';
import { MODELS, getTimeout } from '../../src/config/models.js';
import { eventBus, EVENTS } from './eventBus.js';
import { setState, getState, addLog, updateModelStatus, addTokens, resetState } from './store.js';

// Test cases (same as CLI)
const TEST_CASES = {
  navigation: [
    {
      name: 'Basic Navigation',
      prompt: `Create a responsive navigation bar component with these features:
- Logo on the left side
- 3 navigation links (Home, About, Contact)
- Mobile hamburger menu that toggles visibility
- Use Tailwind CSS for styling
- IMPORTANT: Use onClick handlers with buttons instead of <a href="#">`,
    },
    {
      name: 'Tab Navigation',
      prompt: `Create a tab navigation component with:
- 4 tabs with labels
- Active tab indicator
- Content area that switches based on selected tab
- Smooth transition effects
- Use Tailwind CSS for styling
- IMPORTANT: Use onClick handlers with buttons for tabs, NOT anchor tags`,
    },
    {
      name: 'Sidebar Navigation',
      prompt: `Create a collapsible sidebar navigation with:
- 5 menu items with icons (use emoji as icons)
- Nested submenu for one item
- Collapse/expand toggle button
- Active state styling
- Use Tailwind CSS
- IMPORTANT: Use buttons with onClick for all interactive elements, NOT anchor tags with href="#"`,
    },
  ],
};

// Abort controller for cancellation
let abortController = null;

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get test cases for a suite
 */
export function getTestCases(suite = 'navigation') {
  if (suite === 'all') {
    return Object.values(TEST_CASES).flat();
  }
  return TEST_CASES[suite] || TEST_CASES.navigation;
}

/**
 * Get selected models from config
 */
export function getSelectedModels(selectedIds) {
  return MODELS.filter((m) => selectedIds.includes(m.id));
}

/**
 * Check model availability
 */
export async function checkModelAvailability(models) {
  const available = [];
  const unavailable = [];

  eventBus.emit(EVENTS.AVAILABILITY_START, { models });
  addLog('info', `Checking availability for ${models.length} models...`);

  for (const model of models) {
    if (abortController?.signal.aborted) {
      throw new Error('Benchmark cancelled');
    }

    try {
      addLog('info', `Checking ${model.name}...`, model.id);
      const start = Date.now();

      await callLLM({
        model: model.id,
        systemPrompt: 'You are a test assistant.',
        userPrompt: 'Say hello in one word.',
        maxTokens: 50,
        timeout: 60000,
      });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      available.push(model);
      addLog('success', `${model.name} available (${elapsed}s)`, model.id);

      eventBus.emit(EVENTS.AVAILABILITY_MODEL, {
        model,
        status: 'available',
        elapsed,
      });
    } catch (error) {
      unavailable.push({ model, error: error.message });
      addLog('error', `${model.name} unavailable: ${error.message}`, model.id);

      eventBus.emit(EVENTS.AVAILABILITY_MODEL, {
        model,
        status: 'unavailable',
        error: error.message,
      });
    }

    await sleep(300);
  }

  eventBus.emit(EVENTS.AVAILABILITY_COMPLETE, { available, unavailable });
  addLog('info', `Availability check complete: ${available.length}/${models.length} models available`);

  return { available, unavailable };
}

/**
 * Run a single test with validation loop
 */
export async function runTestWithLoop(model, testCase, options = {}) {
  const { systemPrompt = '', maxIterations = 3 } = options;

  let currentCode = null;
  let iteration = 0;
  let validationResult = null;
  const iterationHistory = [];
  const startTime = Date.now();
  const tokenUsage = { prompt: 0, completion: 0, reasoning: 0 };

  try {
    const timeout = getTimeout(model.id);

    // Initial generation
    iteration = 1;
    eventBus.emit(EVENTS.ITERATION_START, { model, testCase, iteration });
    updateModelStatus(model.id, {
      currentIteration: iteration,
      status: 'generating',
    });
    addLog('info', `Iteration ${iteration}: Initial generation...`, model.id);

    const response = await callLLM({
      model: model.id,
      systemPrompt,
      userPrompt: testCase.prompt,
      maxTokens: 2000,
      temperature: 0.7,
      timeout,
    });

    // Track token usage
    if (response.usage) {
      tokenUsage.prompt += response.usage.prompt_tokens || 0;
      tokenUsage.completion += response.usage.completion_tokens || 0;
      tokenUsage.reasoning += response.usage.completion_tokens_details?.reasoning_tokens || 0;
      addTokens(
        response.usage.prompt_tokens || 0,
        response.usage.completion_tokens || 0,
        response.usage.completion_tokens_details?.reasoning_tokens || 0
      );
    }

    currentCode = extractContent(response);
    validationResult = validateCode(currentCode);

    iterationHistory.push({
      iteration: 1,
      valid: validationResult.valid,
      errors: validationResult.errors.map((e) => e.type),
    });

    eventBus.emit(EVENTS.ITERATION_COMPLETE, {
      model,
      testCase,
      iteration: 1,
      valid: validationResult.valid,
      errors: validationResult.errors,
    });

    if (validationResult.valid) {
      addLog('success', `Iteration ${iteration}: Validation passed!`, model.id);
    } else {
      addLog('warning', `Iteration ${iteration}: ${validationResult.errors.length} error(s) found`, model.id);
    }

    updateModelStatus(model.id, {
      iterationHistory: [...iterationHistory],
    });

    // Validation loop
    while (!validationResult.valid && iteration < maxIterations) {
      if (abortController?.signal.aborted) {
        throw new Error('Benchmark cancelled');
      }

      iteration++;
      eventBus.emit(EVENTS.ITERATION_START, { model, testCase, iteration });
      updateModelStatus(model.id, {
        currentIteration: iteration,
        status: 'fixing',
      });
      addLog('info', `Iteration ${iteration}: Fixing ${validationResult.errors.length} error(s)...`, model.id);

      const errorMessages = validationResult.errors.map((e) => `- ${e.message}\n  Fix: ${e.fix}`).join('\n');

      const fixPrompt = `The following code has validation errors:

\`\`\`jsx
${currentCode}
\`\`\`

ERRORS FOUND:
${errorMessages}

IMPORTANT - How to fix MISMATCHED_TAGS:
❌ WRONG: <button onClick={...}>Text</a>  (opens button, closes a)
✅ RIGHT: <button onClick={...}>Text</button>  (both must match!)

Please COMPLETELY REWRITE the navigation elements. Return ONLY the fixed code, no explanations.`;

      const fixResponse = await callLLM({
        model: model.id,
        systemPrompt,
        userPrompt: fixPrompt,
        maxTokens: 2000,
        temperature: 0.3,
        timeout,
      });

      if (fixResponse.usage) {
        tokenUsage.prompt += fixResponse.usage.prompt_tokens || 0;
        tokenUsage.completion += fixResponse.usage.completion_tokens || 0;
        tokenUsage.reasoning += fixResponse.usage.completion_tokens_details?.reasoning_tokens || 0;
        addTokens(
          fixResponse.usage.prompt_tokens || 0,
          fixResponse.usage.completion_tokens || 0,
          fixResponse.usage.completion_tokens_details?.reasoning_tokens || 0
        );
      }

      currentCode = extractContent(fixResponse);
      validationResult = validateCode(currentCode);

      iterationHistory.push({
        iteration,
        valid: validationResult.valid,
        errors: validationResult.errors.map((e) => e.type),
      });

      eventBus.emit(EVENTS.ITERATION_COMPLETE, {
        model,
        testCase,
        iteration,
        valid: validationResult.valid,
        errors: validationResult.errors,
      });

      if (validationResult.valid) {
        addLog('success', `Iteration ${iteration}: Validation passed!`, model.id);
      } else {
        addLog('warning', `Iteration ${iteration}: ${validationResult.errors.length} error(s) found`, model.id);
      }

      updateModelStatus(model.id, {
        iterationHistory: [...iterationHistory],
      });

      await sleep(500);
    }

    const endTime = Date.now();

    return {
      success: true,
      code: currentCode,
      validation: validationResult,
      iterations: iteration,
      iterationHistory,
      duration: endTime - startTime,
      passedAfterLoop: validationResult.valid,
      tokenUsage,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      iterations: iteration,
      iterationHistory,
      validation: { valid: false, checks: {} },
      passedAfterLoop: false,
      tokenUsage,
    };
  }
}

/**
 * Run full benchmark
 */
export async function runBenchmark(options = {}) {
  const {
    models,
    testCases,
    systemPrompt = 'You are an expert React developer. Generate clean, valid JSX code.',
    maxIterations = 3,
  } = options;

  // Create new abort controller
  abortController = new AbortController();

  // Reset state
  resetState();
  setState({
    phase: 'checking',
    isRunning: true,
    startTime: Date.now(),
    totalTests: models.length * testCases.length,
    completedTests: 0,
  });

  try {
    // Check availability
    const { available, unavailable } = await checkModelAvailability(models);

    if (abortController.signal.aborted) {
      throw new Error('Benchmark cancelled');
    }

    setState({
      availableModels: available,
      unavailableModels: unavailable,
    });

    if (available.length === 0) {
      throw new Error('No models available');
    }

    // Initialize results and model status
    const results = {};
    const modelStatus = {};

    for (const model of available) {
      results[model.id] = {
        name: model.name,
        tests: [],
        passedFirstTry: 0,
        passedAfterLoop: 0,
        totalFailed: 0,
        totalIterations: 0,
        totalDuration: 0,
        totalTokens: { prompt: 0, completion: 0, reasoning: 0 },
      };

      modelStatus[model.id] = {
        status: 'waiting',
        currentTest: null,
        currentIteration: 0,
        iterationHistory: [],
      };
    }

    setState({
      phase: 'running',
      modelStatus,
      totalTests: available.length * testCases.length,
    });

    eventBus.emit(EVENTS.BENCHMARK_START, { models: available, testCases });
    addLog('info', `Starting benchmark: ${testCases.length} tests x ${available.length} models`);

    // Run tests
    let completedTests = 0;

    for (const testCase of testCases) {
      addLog('info', `Test: "${testCase.name}"`);

      for (const model of available) {
        if (abortController.signal.aborted) {
          throw new Error('Benchmark cancelled');
        }

        eventBus.emit(EVENTS.TEST_START, { model, testCase });
        updateModelStatus(model.id, {
          status: 'running',
          currentTest: testCase.name,
          currentIteration: 0,
          iterationHistory: [],
        });

        addLog('info', `Running "${testCase.name}"...`, model.id);

        const result = await runTestWithLoop(model, testCase, {
          systemPrompt,
          maxIterations,
        });

        if (result.success) {
          if (result.passedAfterLoop) {
            if (result.iterations === 1) {
              addLog('success', `PASSED on first try!`, model.id);
              results[model.id].passedFirstTry++;
            } else {
              addLog('success', `PASSED after ${result.iterations} iterations`, model.id);
              results[model.id].passedAfterLoop++;
            }
          } else {
            addLog('error', `FAILED after ${result.iterations} iterations`, model.id);
            results[model.id].totalFailed++;
          }

          results[model.id].tests.push(result);
          results[model.id].totalIterations += result.iterations;
          results[model.id].totalDuration += result.duration;

          if (result.tokenUsage) {
            results[model.id].totalTokens.prompt += result.tokenUsage.prompt;
            results[model.id].totalTokens.completion += result.tokenUsage.completion;
            results[model.id].totalTokens.reasoning += result.tokenUsage.reasoning;
          }
        } else {
          addLog('error', `ERROR: ${result.error}`, model.id);
          results[model.id].totalFailed++;
        }

        completedTests++;
        setState({ completedTests });

        eventBus.emit(EVENTS.TEST_COMPLETE, { model, testCase, result });
        updateModelStatus(model.id, {
          status: 'waiting',
        });

        await sleep(1000);
      }
    }

    // Mark all models as complete
    for (const model of available) {
      updateModelStatus(model.id, { status: 'complete' });
    }

    setState({
      phase: 'complete',
      isRunning: false,
      results,
    });

    eventBus.emit(EVENTS.BENCHMARK_COMPLETE, { results });
    addLog('success', 'Benchmark complete!');

    return {
      results,
      available,
      unavailable,
      testCount: testCases.length,
    };
  } catch (error) {
    setState({
      phase: 'idle',
      isRunning: false,
    });
    addLog('error', `Benchmark failed: ${error.message}`);
    throw error;
  }
}

/**
 * Cancel running benchmark
 */
export function cancelBenchmark() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  setState({
    phase: 'idle',
    isRunning: false,
  });
  addLog('warning', 'Benchmark cancelled by user');
}

export default {
  getTestCases,
  getSelectedModels,
  checkModelAvailability,
  runTestWithLoop,
  runBenchmark,
  cancelBenchmark,
};
