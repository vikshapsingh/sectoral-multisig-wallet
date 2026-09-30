export function EmptyState({ title, description }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-ink-200 font-medium">{title}</p>
      {description && <p className="text-ink-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-alert-600/40 bg-alert-600/10 px-4 py-3 text-sm text-alert-500">
      {message}
    </div>
  );
}
