/**
 * Browser-compatible LLM Client
 * Uses fetch() directly instead of OpenAI SDK
 */

let storedApiKey = null;

export function setApiKey(key) {
  storedApiKey = key;
}

export function getApiKey() {
  return storedApiKey;
}

export function clearApiKey() {
  storedApiKey = null;
}

/**
 * Check if model requires Responses API
 */
function isResponsesAPIModel(model) {
  return model.includes('codex') || model.includes('5.1');
}

/**
 * Check if model is a reasoning model (o1, o3, o4 series)
 */
function isReasoningModel(model) {
  return model.startsWith('o1') || model.startsWith('o3') || model.startsWith('o4');
}

/**
 * Check if model is GPT-5 series
 */
function isGPT5Model(model) {
  return model.includes('gpt-5');
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(status, message) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message?.includes('rate limit')
  );
}

/**
 * Strip markdown code fences from content
 */
function stripMarkdownFences(content) {
  if (!content) return content;
  let stripped = content.replace(/^```(?:jsx?|tsx?|javascript|html|css|json)?\s*\n?/i, '');
  stripped = stripped.replace(/\n?```\s*$/i, '');
  return stripped.trim();
}

/**
 * Call Responses API (for codex models)
 */
async function callResponsesAPI({ model, messages, maxTokens, timeout }) {
  if (!storedApiKey) {
    throw new Error('API key not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: messages,
        max_output_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error?.message || `API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    // Normalize token usage fields
    const normalizedUsage = data.usage
      ? {
          prompt_tokens: data.usage.input_tokens || 0,
          completion_tokens: data.usage.output_tokens || 0,
          total_tokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          completion_tokens_details: {
            reasoning_tokens: data.usage.output_tokens_details?.reasoning_tokens || 0,
          },
        }
      : {};

    return {
      choices: [
        {
          message: {
            content: data.output?.[0]?.content?.[0]?.text || data.output_text || '',
          },
        },
      ],
      usage: normalizedUsage,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Call Chat Completions API
 */
async function callChatCompletionsAPI({ model, messages, maxTokens, temperature, timeout, needsSpecialHandling }) {
  if (!storedApiKey) {
    throw new Error('API key not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const tokenParam = needsSpecialHandling ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens };
  const tempParam = needsSpecialHandling ? {} : { temperature };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        ...tokenParam,
        ...tempParam,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const error = new Error(errorBody.error?.message || `API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Main LLM call function
 */
export async function callLLM({
  model,
  systemPrompt = '',
  userPrompt = '',
  messages = null,
  maxTokens = 2000,
  temperature = 0.7,
  timeout = 120000,
  maxRetries = 3,
  baseDelay = 1000,
}) {
  if (!storedApiKey) {
    throw new Error('API key not set. Please enter your OpenAI API key.');
  }

  const useResponsesAPI = isResponsesAPIModel(model);
  const isGPT5 = isGPT5Model(model);
  const isReasoning = isReasoningModel(model);
  const needsSpecialHandling = isGPT5 || isReasoning;

  // Increase tokens for models that use reasoning
  const effectiveMaxTokens = needsSpecialHandling ? Math.max(maxTokens * 4, 6000) : maxTokens;

  // Build messages array
  let finalMessages = [];
  if (messages && messages.length > 0) {
    finalMessages = messages;
  } else {
    if (systemPrompt) {
      finalMessages.push({ role: 'system', content: systemPrompt });
    }
    if (userPrompt) {
      finalMessages.push({ role: 'user', content: userPrompt });
    }
  }

  // Retry loop
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (useResponsesAPI) {
        return await callResponsesAPI({
          model,
          messages: finalMessages,
          maxTokens: effectiveMaxTokens,
          timeout,
        });
      } else {
        return await callChatCompletionsAPI({
          model,
          messages: finalMessages,
          maxTokens: effectiveMaxTokens,
          temperature,
          timeout,
          needsSpecialHandling,
        });
      }
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error.status, error.message) || attempt === maxRetries - 1) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`LLM call failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Extract content from LLM response
 */
export function extractContent(response) {
  if (!response?.choices?.[0]?.message?.content) {
    return '';
  }
  const content = response.choices[0].message.content;
  return stripMarkdownFences(content);
}

/**
 * Test API key by making a simple request
 */
export async function testApiKey(apiKey) {
  const previousKey = storedApiKey;
  try {
    setApiKey(apiKey);
    await callLLM({
      model: 'gpt-4o-mini',
      systemPrompt: 'You are a test assistant.',
      userPrompt: 'Say "ok" and nothing else.',
      maxTokens: 10,
      timeout: 30000,
      maxRetries: 1,
    });
    return { valid: true };
  } catch (error) {
    setApiKey(previousKey);
    return { valid: false, error: error.message };
  }
}

export default {
  setApiKey,
  getApiKey,
  clearApiKey,
  callLLM,
  extractContent,
  testApiKey,
};
