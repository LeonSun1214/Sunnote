import { useId, useState } from 'react';
import type { Subject } from '../../types';
import type { TrendPoint } from '../../utils/stats';
import { formatAccuracy } from '../../utils/stats';
import { formatDate } from '../../utils/date';
import { subjectVar } from '../../utils/ui';
import { TooltipRow, TooltipShell } from './ChartTooltip';

interface Props {
  subject: Subject;
  points: TrendPoint[];
  /** Router 分流线之类的参考线，画在 y 轴上（0–1）。 */
  reference?: { value: number; label: string };
}

const VIEW = { w: 320, h: 150 };
const PAD = { top: 10, right: 8, bottom: 22, left: 30 };
const PLOT = {
  w: VIEW.w - PAD.left - PAD.right,
  h: VIEW.h - PAD.top - PAD.bottom,
};

/**
 * 正确率随时间的走势。单系列 —— 标题已经说明画的是什么，不需要图例。
 * 手写 SVG 而不用图表库：只有一条线，为它引一个 500KB 的依赖不划算，
 * 而且这样和旁边的横条、迷你线用的是同一套图元规范。
 */
export function TrendChart({ subject, points, reference }: Props) {
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const data = points.filter((p) => p.accuracy !== null) as (TrendPoint & { accuracy: number })[];

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        至少录两次练习才能画出走势。
      </p>
    );
  }

  const color = subjectVar(subject);
  const stepX = data.length > 1 ? PLOT.w / (data.length - 1) : 0;
  const x = (i: number) => PAD.left + i * stepX;
  const y = (v: number) => PAD.top + (1 - v) * PLOT.h;

  const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.accuracy)}`).join(' ');
  const active = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="w-full"
        style={{ height: 190 }}
        role="img"
        aria-label={`正确率走势，共 ${data.length} 次练习，最新 ${formatAccuracy(data[data.length - 1].accuracy)}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={PLOT.w} height={PLOT.h} />
          </clipPath>
        </defs>

        {/* 网格与刻度：弱化，不跟数据抢视线 */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT.w}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
            <text x={PAD.left - 5} y={y(tick) + 3} textAnchor="end" fontSize={8} fill="var(--chart-ink)">
              {tick * 100}%
            </text>
          </g>
        ))}

        {reference && (
          <g>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT.w}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke="var(--chart-ink)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <text x={PAD.left + PLOT.w} y={y(reference.value) - 4} textAnchor="end" fontSize={8} fill="var(--chart-ink)">
              {reference.label}
            </text>
          </g>
        )}

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
          vectorEffect="non-scaling-stroke"
        />

        {/* 悬停时的十字线 */}
        {active && (
          <line
            x1={x(hover!)}
            x2={x(hover!)}
            y1={PAD.top}
            y2={PAD.top + PLOT.h}
            stroke="var(--chart-ink)"
            strokeWidth={1}
          />
        )}

        {data.map((p, i) => (
          <circle
            key={p.date + i}
            cx={x(i)}
            cy={y(p.accuracy)}
            r={hover === i ? 4.5 : 3}
            fill={color}
            stroke="var(--chart-surface)"
            strokeWidth={hover === i ? 2 : 0}
          />
        ))}

        {/* 命中区比圆点大得多，手机上也点得到 */}
        {data.map((p, i) => (
          <rect
            key={`hit-${p.date}-${i}`}
            x={x(i) - stepX / 2}
            y={PAD.top}
            width={Math.max(stepX, 12)}
            height={PLOT.h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={-1}
          />
        ))}

        {/* x 轴只标首末，中间靠 tooltip */}
        <text x={PAD.left} y={VIEW.h - 6} fontSize={8} fill="var(--chart-ink)">
          {formatDate(data[0].date).slice(5)}
        </text>
        <text x={PAD.left + PLOT.w} y={VIEW.h - 6} textAnchor="end" fontSize={8} fill="var(--chart-ink)">
          {formatDate(data[data.length - 1].date).slice(5)}
        </text>
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2"
          style={{ left: `${((x(hover!) ) / VIEW.w) * 100}%` }}
        >
          <TooltipShell title={`${active.setName} · ${formatDate(active.date)}`}>
            <TooltipRow label="正确率" value={formatAccuracy(active.accuracy)} swatch={color} />
            {active.band != null && <TooltipRow label="Band" value={`${active.band}`} />}
            {active.selfScore != null && <TooltipRow label="主观题自评" value={active.selfScore.toFixed(1)} />}
          </TooltipShell>
        </div>
      )}
    </div>
  );
}
