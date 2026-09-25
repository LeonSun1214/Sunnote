import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  EXAM_LABELS,
  EXAM_ORDER,
  SUBJECT_CONFIGS,
  subjectFullLabel,
  subjectsOfExam,
} from '../config/exams';
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
import type { AppSettings, Exam, Session } from '../types';
import { daysSince, formatDate, relativeTime } from '../utils/date';
import { formatTarget, nearestExamPlan } from '../utils/plan';
import { subjectStyle, cx } from '../utils/ui';

/** 超过这么多天没导出就提醒备份 —— 浏览器数据清掉就没了。 */
const BACKUP_REMINDER_DAYS = 7;

export function Dashboard() {
  const { data } = useAppData();
  const { sessions, notes, settings } = data;

  const streak = useMemo(() => studyStreak(sessions), [sessions]);
  const weakest = useMemo(() => weakestTaskTypes(sessions).slice(0, 6), [sessions]);

  // Router 达线率跨听力和阅读一起算 —— 两科都是同一套两段自适应结构
  const adaptiveSessions = useMemo(
    // Router 达线率是托福特有的 —— 雅思不自适应，没有这条线
    () => sessions.filter((s) => SUBJECT_CONFIGS[s.subject]?.adaptive),
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
        <ExamCountdown plans={settings.plans} />
        <EmptyState
          title="从录第一次练习开始"
          hint="托福或雅思都行。选一科进去填这套题错了几个，正确率会自动算出来。每一科都有自己的错题笔记区，用来攒知识点。"
          action={
            <div className="space-y-2">
              {EXAM_ORDER.map((exam) => (
                <div key={exam} className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{EXAM_LABELS[exam]}</span>
                  {subjectsOfExam(exam).map((s) => (
                    <Link key={s.key} to={`/${s.key}/new`} className="btn-ghost">
                      录{s.label}
                    </Link>
                  ))}
                </div>
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
      <ExamCountdown plans={settings.plans} />

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
          hint={router.attempts > 0 ? `${router.passes}/${router.attempts} 次` : '托福听力/阅读'}
        />
      </div>

      {router.attempts > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold">Router 分流</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            托福听力和阅读的 Router 都是 20 题，答对 {itemsNeededToPass(20, 0.7)} 题以上才进 Upper。
            进不了 Upper 分数就封顶 Band 4，所以这条线比总正确率更要紧。
            目前 Router 平均正确率{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{formatAccuracy(router.averageAccuracy)}</span>。
          </p>
        </section>
      )}

      {EXAM_ORDER.map((exam) => (
        <ExamOverview key={exam} exam={exam} sessions={sessions} />
      ))}

      {weakest.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold">薄弱题型</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            跨所有科目按正确率排序，最弱的在最上面。只统计累计做过 5 题以上的题型。
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
                    <span className={cx('mr-1.5 text-xs', subjectStyle(note.subject).text)}>
                      {subjectFullLabel(note.subject)}
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

/**
 * 一个考试的四科概览。没录过的考试只留一行入口 —— 八张空卡片挤在一起
 * 既没信息量又把有数据的那组推到屏幕外。
 */
function ExamOverview({ exam, sessions }: { exam: Exam; sessions: Session[] }) {
  const configs = subjectsOfExam(exam);
  const hasData = sessions.some((s) => SUBJECT_CONFIGS[s.subject]?.exam === exam);

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{EXAM_LABELS[exam]}</h2>
      {hasData ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {configs.map((config) => {
            const subjectSessions = sessionsBySubject(sessions, config.key);
            const accs = sortChronologically(subjectSessions)
              .map(sessionAccuracy)
              .filter((a): a is number => a !== null);
            const latest = subjectSessions[0];
            const style = subjectStyle(config.key);

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
                  {latest ? `${subjectSessions.length} 次 · 最近 ${formatDate(latest.date)}` : '还没录过'}
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
      ) : (
        <div className="card flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          <span>还没录过{EXAM_LABELS[exam]}</span>
          {configs.map((config) => (
            <Link key={config.key} to={`/${config.key}/new`} className={cx('hover:underline', subjectStyle(config.key).text)}>
              录{config.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold">仪表盘</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        托福（新版 2026 自适应）· 雅思（Academic）
      </p>
    </header>
  );
}

/**
 * 最近一场考试的倒计时，来自考试计划页。没填日期、或日期已过就什么都不渲染 ——
 * 页面顶部不该留一块「还没设置考试日期」的空壳。
 */
function ExamCountdown({ plans }: { plans: AppSettings['plans'] }) {
  const upcoming = nearestExamPlan(plans);
  if (!upcoming) return null;
  const { exam, days, date, target } = upcoming;
  const examName = EXAM_LABELS[exam];

  return (
    <Link
      to="/plan"
      className="card flex items-end justify-between gap-3 transition hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{days === 0 ? `${examName}考试` : `距${examName}考试`}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {days === 0 ? '今天' : days}
          {days > 0 && <span className="ml-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">天</span>}
        </p>
      </div>
      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
        <p>{formatDate(date)}</p>
        {target !== undefined && (
          <p className="mt-0.5">
            目标 <span className="font-medium text-slate-900 dark:text-slate-100">{formatTarget(exam, target)}</span>
          </p>
        )}
      </div>
    </Link>
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
