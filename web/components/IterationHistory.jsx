export function IterationHistory({ history, maxIterations }) {
  // Build array of dots to show
  const dots = [];

  for (let i = 0; i < maxIterations; i++) {
    const iteration = history[i];

    if (iteration) {
      dots.push({
        iteration: i + 1,
        status: iteration.valid ? 'pass' : 'fail',
        errors: iteration.errors,
      });
    } else if (i === history.length) {
      // Next iteration (active)
      dots.push({
        iteration: i + 1,
        status: 'active',
        errors: [],
      });
    } else {
      // Future iteration
      dots.push({
        iteration: i + 1,
        status: 'pending',
        errors: [],
      });
    }
  }

  return (
    <div className="iteration-history">
      {dots.map((dot, index) => (
        <>
          <div
            key={dot.iteration}
            className={`iteration-dot ${dot.status}`}
            title={dot.errors?.length ? dot.errors.join(', ') : dot.status}
          >
            {dot.status === 'pass' && '✓'}
            {dot.status === 'fail' && '✗'}
            {dot.status === 'active' && '●'}
            {dot.status === 'pending' && '○'}
          </div>
          {index < dots.length - 1 && <span className="iteration-arrow">→</span>}
        </>
      ))}
    </div>
  );
}

export default IterationHistory;
