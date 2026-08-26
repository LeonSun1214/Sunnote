import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useSubjectParam } from './useSubjectParam';
import { useSubjectNotes, useSubjectSessions } from '../../store/hooks';
import { StatsTab } from './StatsTab';
import { NoteList } from '../../components/notes/NoteList';
import { AccuracyBadge } from '../../components/AccuracyBadge';
import { EmptyState } from '../../components/EmptyState';
import { blocksTotals, sessionAccuracy } from '../../utils/stats';
import { formatDate } from '../../utils/date';
import { SUBJECT_STYLES, cx } from '../../utils/ui';

const TABS = [
  { key: 'sessions', label: '练习记录' },
  { key: 'stats', label: '统计' },
  { key: 'notes', label: '错题笔记' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function SubjectPage() {
  const config = useSubjectParam();
  const [searchParams, setSearchParams] = useSearchParams();

  const sessions = useSubjectSessions(config?.key ?? 'listening');
  const notes = useSubjectNotes(config?.key ?? 'listening');

  if (!config) return <Navigate to="/" replace />;

  const rawTab = searchParams.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'sessions';
  const style = SUBJECT_STYLES[config.key];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">
          <span className={style.text}>{config.label}</span>
          <span className="ml-1.5 text-sm font-normal text-slate-400 dark:text-slate-500">{config.labelEn}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{config.blurb}</p>
      </header>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSearchParams(t.key === 'sessions' ? {} : { tab: t.key }, { replace: true })}
              className={cx(
                'flex-1 rounded-md px-3 py-1.5 text-sm transition',
                tab === t.key
                  ? 'bg-white font-medium shadow-sm dark:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {t.label}
              {t.key === 'notes' && notes.length > 0 && (
                <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{notes.length}</span>
              )}
            </button>
          ))}
        </div>
        <Link to={`/${config.key}/new`} className="btn-primary shrink-0">
          + 录练习
        </Link>
      </div>

      {tab === 'sessions' && (
        sessions.length === 0 ? (
          <EmptyState
            title={`还没有${config.label}练习记录`}
            hint={config.blurb}
            action={
              <Link to={`/${config.key}/new`} className="btn-primary">
                录入第一次练习
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => {
              const totals = blocksTotals(session.blocks);
              return (
                <li key={session.id}>
                  <Link
                    to={`/${config.key}/session/${session.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{session.setName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(session.date)}</span>
                        {session.path && <span>Router → {session.path === 'upper' ? 'Upper' : 'Lower'}</span>}
                        {totals.total > 0 && <span>{totals.total} 题 · 错 {totals.wrong}</span>}
                        {session.band != null && <span>Band {session.band}</span>}
                      </p>
                    </div>
                    <AccuracyBadge value={sessionAccuracy(session)} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      )}

      {tab === 'stats' && <StatsTab config={config} sessions={sessions} />}
      {tab === 'notes' && <NoteList subject={config.key} notes={notes} />}
    </div>
  );
}
