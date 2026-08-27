import { useMemo } from 'react';
import type { Session, SubjectConfig } from '../../types';
import { TrendChart } from '../../components/charts/TrendChart';
import { TaskTypeBars } from '../../components/charts/TaskTypeBars';
import { AccuracyBadge } from '../../components/AccuracyBadge';
import { EmptyState } from '../../components/EmptyState';
import {
  averageSelfScore,
  byModule,
  byTaskType,
  formatAccuracy,
  itemsNeededToPass,
  pathDistribution,
  routerStat,
  rubricHitCounts,
  trend,
} from '../../utils/stats';
import { getTaskType } from '../../config/subjects';

export function StatsTab({ config, sessions }: { config: SubjectConfig; sessions: Session[] }) {
  const threshold = config.routingThreshold ?? 0.7;

  const points = useMemo(() => trend(sessions), [sessions]);
  const taskStats = useMemo(
    () =>
      byTaskType(sessions)
        .filter((s) => s.accuracy !== null)
        .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1)),
    [sessions],
  );
  const modules = useMemo(() => byModule(sessions), [sessions]);
  const router = useMemo(() => routerStat(sessions, threshold), [sessions, threshold]);
  const paths = useMemo(() => pathDistribution(sessions), [sessions]);
  const rubrics = useMemo(() => rubricHitCounts(sessions).slice(0, 6), [sessions]);

  if (sessions.length === 0) {
    return <EmptyState title="还没有数据" hint="录入第一次练习后，这里会出现走势和题型排行。" />;
  }

  const routerModule = config.modules?.find((m) => m.key === 'router');
  const needed = routerModule ? itemsNeededToPass(routerModule.scoredItems, threshold) : 0;

  const allSelfScores = sessions.flatMap((s) => s.tasks);
  const avgSelf = averageSelfScore(allSelfScores);

  return (
    <div className="space-y-4">
      {config.adaptive && router.attempts > 0 && (
        <section className="card">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Router 达线率</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {router.attempts} 次里有 {router.passes} 次答对 {needed} 题以上，过了 {Math.round(threshold * 100)}% 分流线。
                达不到就只能进 Lower，分数封顶 Band {config.modules?.find((m) => m.key === 'lower')?.maxBand ?? 4}。
              </p>
            </div>
            <AccuracyBadge value={router.passRate} size="lg" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Router 平均正确率{' '}
              <span className="font-medium text-slate-900 dark:text-slate-100">{formatAccuracy(router.averageAccuracy)}</span>
            </span>
            <span>
              实际走向 <span className="font-medium text-slate-900 dark:text-slate-100">Upper {paths.upper} 次 · Lower {paths.lower} 次</span>
            </span>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 text-sm font-semibold">{config.label}正确率走势</h2>
        <TrendChart
          subject={config.key}
          points={points}
          reference={config.adaptive ? { value: threshold, label: `${Math.round(threshold * 100)}% 分流线` } : undefined}
        />
      </section>

      <section className="card">
        <h2 className="mb-1 text-sm font-semibold">题型正确率</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">弱的排在上面，先补这几个。</p>
        <TaskTypeBars stats={taskStats} emptyHint="还没有客观题数据。" />
      </section>

      {modules.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-sm font-semibold">分模块正确率</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {modules.map((m) => {
              const moduleConfig = config.modules?.find((mc) => mc.key === m.module);
              return (
                <div key={m.module} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{moduleConfig?.label ?? m.module}</p>
                  <AccuracyBadge value={m.accuracy} detail={{ total: m.total, wrong: m.wrong }} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {allSelfScores.length > 0 && (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">主观题自评</h2>
            <span className="text-lg font-semibold tabular-nums">
              {avgSelf?.toFixed(1) ?? '—'}
              <span className="ml-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">/5 平均</span>
            </span>
          </div>
          {rubrics.length > 0 && (
            <>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">最常犯的扣分点</p>
              <ul className="space-y-1.5">
                {rubrics.map((r) => {
                  const taskConfig = getTaskType(config.key, r.taskType);
                  const label = taskConfig?.rubric?.find((item) => item.id === r.rubricId)?.label ?? r.rubricId;
                  return (
                    <li key={`${r.taskType}::${r.rubricId}`} className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">
                        <span className="mr-1.5 text-slate-500 dark:text-slate-400">{taskConfig?.label}</span>
                        <span className="text-slate-700 dark:text-slate-200">{label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium">{r.count} 次</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
