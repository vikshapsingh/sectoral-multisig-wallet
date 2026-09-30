export function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-3 text-ink-400 text-sm py-8 justify-center">
      <span className="h-4 w-4 rounded-full border-2 border-ink-600 border-t-signal-400 animate-spin" />
      {label}
    </div>
  );
}
