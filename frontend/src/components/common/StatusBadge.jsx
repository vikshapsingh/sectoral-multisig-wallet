import { STATUS_STYLES } from '../../utils/format';

export function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}
