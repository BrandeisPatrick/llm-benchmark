/**
 * Console Reporter
 * Formats and displays benchmark results in the terminal
 */

/**
 * Print a header with box drawing
 */
export function printHeader(title) {
  console.log('\n╔' + '═'.repeat(68) + '╗');
  console.log('║' + title.padStart(34 + title.length / 2).padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
}

/**
 * Print a section header
 */
export function printSectionHeader(title) {
  console.log('\n' + '─'.repeat(70));
  console.log(title);
  console.log('─'.repeat(70));
}

/**
 * Format check result as emoji
 */
export function formatCheck(passed) {
  return passed ? '✅' : '❌';
}

/**
 * Print model availability results
 */
export function printAvailability(available, unavailable) {
  console.log('\n🔍 Model Availability:\n');
  console.log(`   Available: ${available.length}`);
  console.log(`   Unavailable: ${unavailable.length}\n`);

  if (unavailable.length > 0) {
    console.log('   Unavailable models:');
    unavailable.forEach((u) => {
      console.log(`     - ${u.model.name}: ${u.error}`);
    });
    console.log('');
  }
}

/**
 * Print iteration history for a test
 */
export function printIterationHistory(history) {
  return history
    .map((h) => (h.valid ? '✅' : `❌(${h.errors.join(',')})`))
    .join(' → ');
}

/**
 * Print summary table
 */
export function printSummary(results, models) {
  printHeader('SUMMARY');

  console.log(
    'Model'.padEnd(16) +
      '1st Try'.padEnd(8) +
      'Fixed'.padEnd(8) +
      'Failed'.padEnd(8) +
      'Avg Time'.padEnd(10) +
      'Tokens (P/C/R)'
  );
  console.log('═'.repeat(78));

  for (const model of models) {
    const r = results[model.id];
    if (!r) continue;

    const totalTests = r.passedFirstTry + r.passedAfterLoop + r.totalFailed;
    const avgTime = totalTests > 0 ? (r.totalDuration / totalTests / 1000).toFixed(1) + 's' : 'N/A';
    const tokenStr = `${r.totalTokens.prompt}/${r.totalTokens.completion}/${r.totalTokens.reasoning}`;

    console.log(
      r.name.padEnd(16) +
        r.passedFirstTry.toString().padEnd(8) +
        r.passedAfterLoop.toString().padEnd(8) +
        r.totalFailed.toString().padEnd(8) +
        avgTime.padEnd(10) +
        tokenStr
    );
  }

  console.log('═'.repeat(78));
  console.log('Tokens: P=Prompt, C=Completion, R=Reasoning\n');
}

/**
 * Print analysis section
 */
export function printAnalysis(results, models) {
  console.log('📊 ANALYSIS:\n');

  for (const model of models) {
    const r = results[model.id];
    if (!r) continue;

    const total = r.passedFirstTry + r.passedAfterLoop + r.totalFailed;
    const firstTryRate = total > 0 ? ((r.passedFirstTry / total) * 100).toFixed(0) : 0;
    const loopSuccessRate = total > 0 ? (((r.passedFirstTry + r.passedAfterLoop) / total) * 100).toFixed(0) : 0;

    console.log(`   ${r.name}:`);
    console.log(`     • First-try success rate: ${firstTryRate}%`);
    console.log(`     • After validation loop:  ${loopSuccessRate}%`);
    console.log(`     • Average iterations:     ${(r.totalIterations / total).toFixed(1)}\n`);
  }
}

/**
 * Print validation loop effectiveness
 */
export function printLoopEffectiveness(results, models, totalTests) {
  console.log('📈 VALIDATION LOOP EFFECTIVENESS:\n');

  for (const model of models) {
    const r = results[model.id];
    if (!r) continue;

    const fixedByLoop = r.passedAfterLoop;
    if (fixedByLoop > 0) {
      console.log(`   ✅ ${r.name}: Validation loop fixed ${fixedByLoop} test(s) that would have failed!`);
    } else if (r.passedFirstTry === totalTests) {
      console.log(`   🎯 ${r.name}: All tests passed on first try (loop not needed)`);
    } else {
      console.log(`   ⚠️  ${r.name}: Validation loop couldn't fix ${r.totalFailed} failure(s)`);
    }
  }
  console.log('');
}

export default {
  printHeader,
  printSectionHeader,
  formatCheck,
  printAvailability,
  printIterationHistory,
  printSummary,
  printAnalysis,
  printLoopEffectiveness,
};
