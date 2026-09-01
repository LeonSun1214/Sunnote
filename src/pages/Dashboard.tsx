import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SUBJECT_LIST } from '../config/subjects';
import { useAppData } from '../store/hooks';
import { Sparkline, TaskTypeBars } from '../components/charts/TaskTypeBars';
import { AccuracyBadge } from '../components/AccuracyBadge';
import { EmptyState } from '../components/EmptyState';
import {
  formatAccuracy,
  itemsNeededToPass,
  routerStat,
  sessionAccuracy,
  sessionsBySubject,
  sortChronologically,
  studyStreak,
  weakestTaskTypes,
} from '../utils/stats';
import { daysSince, formatDate, relativeTime } from '../utils/date';
import { SUBJECT_STYLES, cx } from '../utils/ui';

/** 超过这么多天没导出就提醒备份 —— 浏览器数据清掉就没了。 */
const BACKUP_REMINDER_DAYS = 7;

export function Dashboard() {
  const { data } = useAppData();
  const { sessions, notes, settings } = data;

  const streak = useMemo(() => studyStreak(sessions), [sessions]);
  const weakest = useMemo(() => weakestTaskTypes(sessions).slice(0, 6), [sessions]);

  // Router 达线率跨听力和阅读一起算 —— 两科都是同一套两段自适应结构
  const adaptiveSessions = useMemo(
    () => sessions.filter((s) => s.subject === 'listening' || s.subject === 'reading'),
    [sessions],
  );
  const router = useMemo(() => routerStat(adaptiveSessions, 0.7), [adaptiveSessions]);

  const sinceExport = daysSince(settings.lastExportedAt);
  const needsBackup = sessions.length > 0 && (sinceExport === null || sinceExport >= BACKUP_REMINDER_DAYS);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4),
    [notes],
  );

  if (sessions.length === 0 && notes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Header />
        <EmptyState
          title="从录第一次练习开始"
          hint="选一科进去，填上这套题各题型的题数和错题数，正确率会自动算出来。四科都有自己的错题笔记区，用来攒知识点。"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {SUBJECT_LIST.map((s) => (
                <Link key={s.key} to={`/${s.key}/new`} className="btn-ghost">
                  录{s.label}
                </Link>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Header />

      {needsBackup && (
        <Link
          to="/settings"
          className="block rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 transition hover:border-amber-400 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
        >
          ⚠︎ 数据只存在这个浏览器里，清缓存或换设备就没了。
          {sinceExport === null ? '还没备份过' : `上次备份是 ${sinceExport} 天前`} —— 去设置页导出一份 JSON。
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="连续练习" value={streak > 0 ? `${streak}` : '—'} unit={streak > 0 ? '天' : undefined} />
        <StatTile label="累计练习" value={`${sessions.length}`} unit="次" />
        <StatTile label="错题笔记" value={`${notes.length}`} unit="条" />
        <StatTile
          label="Router 达线率"
          value={formatAccuracy(router.passRate)}
          hint={router.attempts > 0 ? `${router.passes}/${router.attempts} 次` : '听力/阅读'}
        />
      </div>

      {router.attempts > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold">Router 分流</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            听力和阅读的 Router 都是 20 题，答对 {itemsNeededToPass(20, 0.7)} 题以上才进 Upper。
            进不了 Upper 分数就封顶 Band 4，所以这条线比总正确率更要紧。
            目前 Router 平均正确率{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{formatAccuracy(router.averageAccuracy)}</span>。
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">四科概览</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SUBJECT_LIST.map((config) => {
            const subjectSessions = sessionsBySubject(sessions, config.key);
            const accs = sortChronologically(subjectSessions)
              .map(sessionAccuracy)
              .filter((a): a is number => a !== null);
            const latest = subjectSessions[0];
            const style = SUBJECT_STYLES[config.key];

            return (
              <Link
                key={config.key}
                to={`/${config.key}`}
                className="card transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cx('text-sm font-semibold', style.text)}>{config.label}</p>
                  <AccuracyBadge value={latest ? sessionAccuracy(latest) : null} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {latest
                    ? `${subjectSessions.length} 次 · 最近 ${formatDate(latest.date)}`
                    : '还没录过'}
                </p>
                {accs.length >= 2 && (
                  <div className="mt-2">
                    <Sparkline subject={config.key} values={accs.slice(-12)} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {weakest.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold">薄弱题型</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            跨四科按正确率排序，最弱的在最上面。只统计累计做过 5 题以上的题型。
          </p>
          <TaskTypeBars stats={weakest} showSubject />
        </section>
      )}

      {recentNotes.length > 0 && (
        <section className="card">
          <h2 className="mb-2 text-sm font-semibold">最近的错题笔记</h2>
          <ul className="space-y-1.5">
            {recentNotes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/${note.subject}/note/${note.id}`}
                  className="flex items-baseline justify-between gap-3 text-sm transition hover:underline"
                >
                  <span className="min-w-0 truncate">
                    <span className={cx('mr-1.5 text-xs', SUBJECT_STYLES[note.subject].text)}>
                      {SUBJECT_LIST.find((s) => s.key === note.subject)?.label}
                    </span>
                    {note.title}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {relativeTime(note.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold">仪表盘</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">托福备考 · 新版 2026 自适应格式</p>
    </header>
  );
}

function StatTile({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{unit}</span>}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
