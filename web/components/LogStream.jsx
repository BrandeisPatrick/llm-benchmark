import { useRef, useEffect } from 'preact/hooks';

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function LogStream({ logs }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="log-panel" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
        Logs will appear here when the benchmark starts...
      </div>
    );
  }

  return (
    <div className="log-panel" ref={containerRef}>
      {logs.map((log) => (
        <div key={log.id} className="log-entry">
          <span className="log-time">{formatTime(log.timestamp)}</span>
          {log.model && <span className="log-model">[{log.model}]</span>}
          <span className={`log-message ${log.level}`}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

export default LogStream;
