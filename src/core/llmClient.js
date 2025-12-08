/**
 * LLM Client for Node.js
 * Unified interface for OpenAI API calls (Chat Completions + Responses API)
 */

import OpenAI from 'openai';

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Check if model requires Responses API instead of Chat Completions API
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
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  return (
    error.status === 429 ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('rate limit')
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
  const useResponsesAPI = isResponsesAPIModel(model);
  const isGPT5 = isGPT5Model(model);
  const isReasoning = isReasoningModel(model);
  const needsSpecialHandling = isGPT5 || isReasoning;

  // Increase tokens for models that use reasoning
  const effectiveMaxTokens = needsSpecialHandling ? Math.max(maxTokens * 4, 6000) : maxTokens;

  // Route to Responses API for codex models
  if (useResponsesAPI) {
    let responsesMessages = messages;
    if (!responsesMessages || responsesMessages.length === 0) {
      responsesMessages = [];
      if (systemPrompt) {
        responsesMessages.push({ role: 'system', content: systemPrompt });
      }
      if (userPrompt) {
        responsesMessages.push({ role: 'user', content: userPrompt });
      }
    }

    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await callResponsesAPI({
          model,
          messages: responsesMessages,
          maxTokens: effectiveMaxTokens,
          timeout,
        });
      } catch (error) {
        lastError = error;
        if (!isRetryableError(error) || attempt === maxRetries - 1) {
          throw error;
        }
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`LLM call failed (attempt ${attempt + 1}/${maxRetries}): ${error.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
    throw lastError;
  }

  // Chat Completions API
  const tokenParam = needsSpecialHandling ? { max_completion_tokens: effectiveMaxTokens } : { max_tokens: maxTokens };
  const tempParam = needsSpecialHandling ? {} : { temperature };

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

  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = getClient();
      const response = await client.chat.completions.create({
        model,
        messages: finalMessages,
        ...tokenParam,
        ...tempParam,
      });
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === maxRetries - 1) {
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

export default { callLLM, extractContent };
