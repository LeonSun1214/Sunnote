import { cx } from '../utils/ui';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  /** 越界时的提示，红字显示在下方。 */
  error?: string;
  className?: string;
}

/**
 * 带 +/- 的数字输入。手机上点按钮比调键盘快，
 * 而且录错题数就是反复 +1 的动作。
 */
export function NumberStepper({ value, onChange, min = 0, max, label, error, className }: Props) {
  const clamp = (next: number) => {
    let v = Number.isFinite(next) ? Math.round(next) : min;
    v = Math.max(v, min);
    if (max != null) v = Math.min(v, max);
    return v;
  };

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
        <button
          type="button"
          aria-label={`${label ?? ''} 减一`}
          className="w-10 shrink-0 bg-slate-100 text-lg font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
        >
          −
        </button>
        <input
          type="number"
          className={cx(
            'w-full min-w-0 border-x border-slate-300 bg-white px-2 py-2 text-center text-sm tabular-nums outline-none dark:border-slate-700 dark:bg-slate-950',
            error && 'text-red-600 dark:text-red-400',
          )}
          value={value}
          min={min}
          max={max}
          aria-label={label}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <button
          type="button"
          aria-label={`${label ?? ''} 加一`}
          className="w-10 shrink-0 bg-slate-100 text-lg font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={() => onChange(clamp(value + 1))}
          disabled={max != null && value >= max}
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
