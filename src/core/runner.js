/**
 * Test Runner
 * Executes benchmarks with validation loop
 */

import { callLLM, extractContent } from './llmClient.js';
import { validateCode } from './validator.js';
import { getTimeout } from '../config/models.js';

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check model availability
 * @param {Array} models - Array of model configs
 * @returns {Object} { available, unavailable }
 */
export async function checkModelAvailability(models) {
  console.log('\n🔍 Checking model availability...\n');
  const available = [];
  const unavailable = [];

  for (const model of models) {
    try {
      process.stdout.write(`   ${model.name.padEnd(16)} `);
      const start = Date.now();
      await callLLM({
        model: model.id,
        systemPrompt: 'You are a test assistant.',
        userPrompt: 'Say hello in one word.',
        maxTokens: 50,
        timeout: 60000,
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ Available (${elapsed}s)`);
      available.push(model);
    } catch (error) {
      console.log(`❌ Unavailable: ${error.message}`);
      unavailable.push({ model, error: error.message });
    }
    await sleep(500);
  }

  console.log(`\n   Summary: ${available.length}/${models.length} models available\n`);
  return { available, unavailable };
}

/**
 * Run a single test with validation loop
 * @param {Object} model - Model config
 * @param {Object} testCase - Test case with name and prompt
 * @param {Object} options - Options including systemPrompt, maxIterations
 * @returns {Object} Test result
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
    console.log(`   Iteration 1: Initial generation...`);

    const timeout = getTimeout(model.id);

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
    }

    currentCode = extractContent(response);
    validationResult = validateCode(currentCode);
    iteration = 1;

    iterationHistory.push({
      iteration: 1,
      valid: validationResult.valid,
      errors: validationResult.errors.map((e) => e.type),
    });

    // Validation loop
    while (!validationResult.valid && iteration < maxIterations) {
      iteration++;
      console.log(`   Iteration ${iteration}: Fixing ${validationResult.errors.length} error(s)...`);

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
      }

      currentCode = extractContent(fixResponse);
      validationResult = validateCode(currentCode);

      iterationHistory.push({
        iteration,
        valid: validationResult.valid,
        errors: validationResult.errors.map((e) => e.type),
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
 * Run benchmark suite
 * @param {Object} options - Benchmark options
 * @returns {Object} Results
 */
export async function runBenchmark(options = {}) {
  const {
    models,
    testCases,
    systemPrompt = 'You are an expert React developer. Generate clean, valid JSX code.',
    maxIterations = 3,
    onTestComplete = null,
  } = options;

  // Check availability
  const { available, unavailable } = await checkModelAvailability(models);

  if (available.length === 0) {
    throw new Error('No models available');
  }

  // Initialize results
  const results = {};
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
  }

  // Run tests
  for (const testCase of testCases) {
    console.log(`\n═══ Test: "${testCase.name}" ═══`);

    for (const model of available) {
      console.log(`\n🧪 ${model.name}:`);

      const result = await runTestWithLoop(model, testCase, {
        systemPrompt,
        maxIterations,
      });

      if (result.success) {
        const history = result.iterationHistory
          .map((h) => (h.valid ? '✅' : `❌(${h.errors.join(',')})`))
          .join(' → ');
        console.log(`   History: ${history}`);

        if (result.passedAfterLoop) {
          if (result.iterations === 1) {
            console.log(`   ✅ PASSED on first try!`);
            results[model.id].passedFirstTry++;
          } else {
            console.log(`   ✅ PASSED after ${result.iterations} iterations`);
            results[model.id].passedAfterLoop++;
          }
        } else {
          console.log(`   ❌ FAILED after ${result.iterations} iterations`);
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
        console.log(`   ❌ ERROR: ${result.error}`);
        results[model.id].totalFailed++;
      }

      if (onTestComplete) {
        onTestComplete({ model, testCase, result });
      }

      await sleep(1000);
    }
  }

  return {
    results,
    available,
    unavailable,
    testCount: testCases.length,
  };
}

export default {
  checkModelAvailability,
  runTestWithLoop,
  runBenchmark,
};
