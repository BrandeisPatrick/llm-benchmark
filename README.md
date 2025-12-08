# LLM Benchmark

A benchmarking tool for comparing LLM model performance on code generation tasks with validation loops.

## Features

- **Multi-Model Comparison** - Test 10+ OpenAI models (GPT-4, GPT-5, o1/o3/o4 reasoning, Codex)
- **Pre-flight Availability Check** - Tests each model before running full suite
- **Validation Loop** - Mimics real agentic workflows: LLM generates → validator catches errors → LLM fixes → repeat
- **Comprehensive Metrics**:
  - First-try success rate
  - Success after validation loop
  - Average iterations needed
  - Token usage (prompt/completion/reasoning)
  - Inference time per model

## Installation

```bash
npm install
```

## Configuration

Set your OpenAI API key:

```bash
export OPENAI_API_KEY=your-api-key
```

## CLI Usage

### Run benchmarks

```bash
# Run all tests with all models
npm run bench

# Run with specific models
node bin/llm-bench run --models gpt-4o-mini,gpt-4.1-mini

# Output JSON for CI/CD
node bin/llm-bench run --reporter json --output results.json
```

### Check model availability

```bash
npm run check

# Check specific models
node bin/llm-bench check --models gpt-4,o3
```

### List available models

```bash
npm run list
```

## Programmatic Usage

```javascript
import { runBenchmark, MODELS, filterModels } from 'llm-benchmark';

const testCases = [
  {
    name: 'Navigation Component',
    prompt: 'Create a React navigation bar with Home, About, Contact links...',
  },
];

const { results, available } = await runBenchmark({
  models: filterModels('gpt-4'),
  testCases,
  maxIterations: 3,
});

console.log(results);
```

## Available Models

| Name | ID | Type |
|------|-----|------|
| GPT-5.1-codex | gpt-5.1-codex-mini | Codex |
| GPT-5-mini | gpt-5-mini | GPT-5 |
| GPT-5-nano | gpt-5-nano | GPT-5 |
| GPT-4.1 | gpt-4.1 | Standard |
| GPT-4.1-mini | gpt-4.1-mini | Standard |
| GPT-4.1-nano | gpt-4.1-nano | Standard |
| GPT-4o | gpt-4o | Standard |
| GPT-4o-mini | gpt-4o-mini | Standard |
| o1-mini | o1-mini | Reasoning |
| o3-mini | o3-mini | Reasoning |
| o4-mini | o4-mini | Reasoning |
| Codex-latest | codex-mini-latest | Codex |

## Validation Checks

The validator catches common issues in generated JSX code:

- **Syntax Errors** - Invalid JSX/JavaScript syntax
- **Navigation Errors** - `href="#"` patterns that cause issues in Sandpack
- **Mismatched Tags** - `<button>...</a>` tag mismatches
- **Duplicate Attributes** - Multiple `className` attributes on same element

## Output Example

```
╔════════════════════════════════════════════════════════════════════╗
║                            SUMMARY                                  ║
╚════════════════════════════════════════════════════════════════════╝

Model           1st Try Fixed   Failed  Avg Time  Tokens (P/C/R)
══════════════════════════════════════════════════════════════════════
GPT-4o-mini     2       1       0       3.2s      1200/800/0
GPT-4.1-mini    3       0       0       4.1s      1100/750/0
o3-mini         2       0       1       12.5s     1300/900/450
══════════════════════════════════════════════════════════════════════

📊 ANALYSIS:

   GPT-4o-mini:
     • First-try success rate: 67%
     • After validation loop:  100%
     • Average iterations:     1.3

   GPT-4.1-mini:
     • First-try success rate: 100%
     • After validation loop:  100%
     • Average iterations:     1.0
```

## License

MIT
