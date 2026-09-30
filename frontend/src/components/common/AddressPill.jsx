import { useState } from 'react';
import { shortenAddress } from '../../utils/format';

export function AddressPill({ address, className = '' }) {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className="text-ink-400">—</span>;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail in insecure contexts; fail silently.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={address}
      className={`inline-flex items-center gap-1.5 rounded-md bg-ink-800 border border-ink-600 px-2 py-0.5 font-mono text-xs text-ink-200 hover:border-signal-500/60 transition-colors focus-ring ${className}`}
    >
      {shortenAddress(address)}
      <span className="text-ink-500">{copied ? 'copied' : 'copy'}</span>
    </button>
  );
}
