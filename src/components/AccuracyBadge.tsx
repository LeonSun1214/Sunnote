import { formatAccuracy } from '../utils/stats';
import { accuracyTone, cx } from '../utils/ui';

interface Props {
  value: number | null;
  /** 附带的 对/总 明细，如 14/20。 */
  detail?: { total: number; wrong: number };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-3xl',
} as const;

export function AccuracyBadge({ value, detail, size = 'md', className }: Props) {
  return (
    <span className={cx('inline-flex items-baseline gap-1.5 font-semibold tabular-nums', accuracyTone(value), SIZES[size], className)}>
      {formatAccuracy(value)}
      {detail && detail.total > 0 && (
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
          {detail.total - Math.min(detail.wrong, detail.total)}/{detail.total}
        </span>
      )}
    </span>
  );
}
