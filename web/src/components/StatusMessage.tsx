interface StatusMessageProps {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
}

const defaults = {
  loading: 'Loading…',
  error: 'Something went wrong loading products. Please try again.',
  empty: 'Nothing to show here.',
};

export function StatusMessage({ kind, message }: StatusMessageProps) {
  const text = message ?? defaults[kind];
  if (kind === 'error') {
    return (
      <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
        {text}
      </p>
    );
  }
  return (
    <p role="status" className="p-4 text-ink-muted">
      {text}
    </p>
  );
}
