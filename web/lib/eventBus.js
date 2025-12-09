/**
 * Simple Event Bus for pub/sub communication
 */

const listeners = new Map();

export const eventBus = {
  on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback);
    }
  },

  emit(event, data) {
    if (listeners.has(event)) {
      listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  },

  clear() {
    listeners.clear();
  },
};

// Event types
export const EVENTS = {
  // Availability checking
  AVAILABILITY_START: 'availability:start',
  AVAILABILITY_MODEL: 'availability:model',
  AVAILABILITY_COMPLETE: 'availability:complete',

  // Benchmark execution
  BENCHMARK_START: 'benchmark:start',
  BENCHMARK_COMPLETE: 'benchmark:complete',

  // Test execution
  TEST_START: 'test:start',
  TEST_COMPLETE: 'test:complete',

  // Iteration tracking
  ITERATION_START: 'iteration:start',
  ITERATION_COMPLETE: 'iteration:complete',

  // Logging
  LOG: 'log',

  // Token usage
  TOKENS: 'tokens',
};

export default eventBus;
