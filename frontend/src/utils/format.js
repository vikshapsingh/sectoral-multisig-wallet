export function shortenAddress(address, chars = 4) {
  if (!address) return '—';
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function formatTokenAmount(rawWeiString, decimals = 18) {
  if (rawWeiString === undefined || rawWeiString === null) return '0';
  try {
    const value = BigInt(rawWeiString);
    const divisor = 10n ** BigInt(decimals);
    const whole = value / divisor;
    const fraction = value % divisor;
    if (fraction === 0n) return whole.toString();
    const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
    return fractionStr ? `${whole}.${fractionStr}` : whole.toString();
  } catch {
    return rawWeiString;
  }
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const STATUS_STYLES = {
  PENDING: 'bg-signal-500/15 text-signal-400 border-signal-500/40',
  APPROVED: 'bg-confirm-600/15 text-confirm-500 border-confirm-600/40',
  EXECUTED: 'bg-ink-700 text-ink-200 border-ink-600',
};

export function functionLabel(functionName) {
  const labels = {
    mint: 'Mint tokens',
    burn: 'Burn tokens',
    pause: 'Pause token',
    unpause: 'Unpause token',
    freeze: 'Freeze address',
    unfreeze: 'Unfreeze address',
    addOwner: 'Add owner',
    removeOwner: 'Remove owner',
    changeThreshold: 'Change threshold',
  };
  return labels[functionName] || functionName || 'Value transfer';
}
