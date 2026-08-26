import type { Subject } from '../../types';
import type { TaskTypeStat } from '../../utils/stats';
import { formatAccuracy } from '../../utils/stats';
import { SUBJECT_CONFIGS, taskTypeLabel } from '../../config/subjects';
import { subjectVar, cx } from '../../utils/ui';

interface Props {
  stats: TaskTypeStat[];
  /** 跨科目排行时显示科目名，单科统计里则省略。 */
  showSubject?: boolean;
  emptyHint?: string;
}

/**
 * 分流线只对听力和阅读有意义 —— 写作口语没有 Router，画上去会误导。
 * 所以阈值按每一行自己的科目取，而不是整张图共用一个。
 */
function routingThresholdFor(subject: Subject): number | null {
  const config = SUBJECT_CONFIGS[subject];
  return config.adaptive ? (config.routingThreshold ?? null) : null;
}

/**
 * 题型正确率横条，弱的排在上面。
 * 排序位置已经把「哪个最弱」讲清楚了，所以颜色只做科目归属，
 * 不再用颜色去编码强弱 —— 一个量的编码通道用一次就够。
 * 手写 SVG 而不用图表库：条形数少、标签长，自己排布更可控。
 */
export function TaskTypeBars({ stats, showSubject = false, emptyHint }: Props) {
  if (stats.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        {emptyHint ?? '还没有足够的数据。'}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {stats.map((stat) => {
        const pct = (stat.accuracy ?? 0) * 100;
        const threshold = routingThresholdFor(stat.subject);
        const belowThreshold = threshold !== null && stat.accuracy !== null && stat.accuracy < threshold;
        return (
          <li key={`${stat.subject}::${stat.taskType}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">
                {showSubject && (
                  <span className="mr-1.5 text-slate-500 dark:text-slate-400">
                    {SUBJECT_CONFIGS[stat.subject].label}
                  </span>
                )}
                <span className="text-slate-700 dark:text-slate-200">
                  {taskTypeLabel(stat.subject, stat.taskType)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-900 dark:text-slate-100">{formatAccuracy(stat.accuracy)}</span>
                <span className="ml-1.5">
                  {stat.total - stat.wrong}/{stat.total}
                </span>
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-r-[4px] transition-[width]"
                style={{ width: `${Math.max(pct, 1.5)}%`, background: subjectVar(stat.subject) }}
              />
              {threshold !== null && (
                <span
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-slate-400 dark:bg-slate-500"
                  style={{ left: `${threshold * 100}%` }}
                />
              )}
            </div>
            {belowThreshold && (
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                低于 {Math.round(threshold * 100)}% 分流线
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 迷你走势线，用在四科概览卡上。单系列，卡片标题已经写明科目。 */
export function Sparkline({ subject, values, className }: { subject: Subject; values: number[]; className?: string }) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 28;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => `${i * step},${height - ((v - min) / span) * height}`).join(' ');
  const last = values[values.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cx('h-7 w-full', className)}
      role="img"
      aria-label={`最近 ${values.length} 次正确率走势，最新 ${Math.round(last * 100)}%`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={subjectVar(subject)}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
