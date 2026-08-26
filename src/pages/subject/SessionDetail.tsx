import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { ModuleKind, ObjectiveBlock } from '../../types';
import { useAppData } from '../../store/hooks';
import { useSubjectParam } from './useSubjectParam';
import { AccuracyBadge } from '../../components/AccuracyBadge';
import { accuracy, blocksAccuracy, blocksTotals, itemsNeededToPass } from '../../utils/stats';
import { formatDate, formatDuration } from '../../utils/date';
import { getTaskType } from '../../config/subjects';
import { SUBJECT_STYLES, cx } from '../../utils/ui';

export function SessionDetail() {
  const config = useSubjectParam();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { data, removeSession } = useAppData();

  const session = data.sessions.find((s) => s.id === sessionId);
  if (!config) return <Navigate to="/" replace />;
  if (!session) return <Navigate to={`/${config.key}`} replace />;

  const style = SUBJECT_STYLES[config.key];
  const overall = blocksAccuracy(session.blocks);
  const totals = blocksTotals(session.blocks);
  const modules: ModuleKind[] = ['router', 'upper', 'lower'];
  const standaloneBlocks = session.blocks.filter((b) => b.module === null);

  const handleDelete = () => {
    if (!window.confirm(`删除「${session.setName}」这次练习记录？此操作不可撤销。`)) return;
    removeSession(session.id);
    navigate(`/${config.key}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <Link to={`/${config.key}`} className="mb-2 inline-block text-xs text-slate-500 hover:underline dark:text-slate-400">
          ← {config.label}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{session.setName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span>{formatDate(session.date)}</span>
              {session.path && (
                <span className={cx('chip', style.bgSoft, style.text)}>Router → {session.path === 'upper' ? 'Upper' : 'Lower'}</span>
              )}
              {session.band != null && (
                <span className="chip bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">Band {session.band}</span>
              )}
            </p>
          </div>
          <AccuracyBadge value={overall} detail={totals} size="lg" />
        </div>
      </header>

      {config.adaptive &&
        modules.map((module) => {
          const blocks = session.blocks.filter((b) => b.module === module);
          if (blocks.length === 0) return null;
          return <ModuleResult key={module} module={module} blocks={blocks} config={config} sessionId={session.id} />;
        })}

      {standaloneBlocks.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-sm font-semibold">客观题</h2>
          {standaloneBlocks.map((block) => (
            <BlockRow key={block.id} block={block} subject={config.key} sessionId={session.id} />
          ))}
        </section>
      )}

      {session.tasks.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">主观题</h2>
          {session.tasks.map((task, i) => {
            const taskConfig = getTaskType(config.key, task.taskType);
            const rubricLabels = task.rubricHits
              .map((id) => taskConfig?.rubric?.find((r) => r.id === id)?.label ?? id)
              .filter(Boolean);
            return (
              <div key={task.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {taskConfig?.label ?? task.taskType}
                    {session.tasks.filter((t) => t.taskType === task.taskType).length > 1 && (
                      <span className="ml-1 text-slate-400 dark:text-slate-500">#{i + 1}</span>
                    )}
                  </p>
                  <span className="text-sm font-semibold tabular-nums">自评 {task.selfScore}/5</span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                  {task.wordCount != null && <span>{task.wordCount} 词</span>}
                  {task.durationSec != null && <span>用时 {formatDuration(task.durationSec)}</span>}
                </p>
                {rubricLabels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rubricLabels.map((label) => (
                      <span key={label} className="chip bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {task.answer && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-slate-500 dark:text-slate-400">查看答案原文</summary>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-950">{task.answer}</p>
                  </details>
                )}
                {task.reflection && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    💭 {task.reflection}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {session.summary && (
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold">本次总结</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{session.summary}</p>
        </section>
      )}

      <div className="flex gap-2">
        <Link to={`/${config.key}/session/${session.id}/edit`} className="btn-ghost flex-1">
          编辑
        </Link>
        <Link to={`/${config.key}/note/new?session=${session.id}`} className="btn-primary flex-1">
          就这次记错题笔记
        </Link>
        <button type="button" className="btn-danger" onClick={handleDelete}>
          删除
        </button>
      </div>
    </div>
  );
}

function ModuleResult({
  module,
  blocks,
  config,
  sessionId,
}: {
  module: ModuleKind;
  blocks: ObjectiveBlock[];
  config: NonNullable<ReturnType<typeof useSubjectParam>>;
  sessionId: string;
}) {
  const moduleConfig = config.modules?.find((m) => m.key === module);
  const acc = blocksAccuracy(blocks);
  const { total, wrong } = blocksTotals(blocks);
  const threshold = config.routingThreshold ?? 0.7;
  const needed = moduleConfig ? itemsNeededToPass(moduleConfig.scoredItems, threshold) : 0;
  const passed = module === 'router' && acc !== null && acc >= threshold;

  return (
    <section className="card space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{moduleConfig?.label ?? module}</h2>
        <AccuracyBadge value={acc} detail={{ total, wrong }} />
      </div>

      {module === 'router' && (
        <p
          className={cx(
            'rounded-lg px-2.5 py-1.5 text-xs',
            passed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
          )}
        >
          {passed ? `过了 ${Math.round(threshold * 100)}% 分流线（需答对 ${needed} 题）` : `没过 ${Math.round(threshold * 100)}% 分流线（需答对 ${needed} 题）`}
        </p>
      )}

      {blocks.map((block) => (
        <BlockRow key={block.id} block={block} subject={config.key} sessionId={sessionId} />
      ))}
    </section>
  );
}

function BlockRow({ block, subject, sessionId }: { block: ObjectiveBlock; subject: string; sessionId: string }) {
  const taskConfig = getTaskType(subject as never, block.taskType);
  const acc = accuracy(block.total, block.wrong);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <div className="min-w-0">
        <p className="truncate text-sm">{taskConfig?.label ?? block.taskType}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {block.total} 题 · 错 {block.wrong}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AccuracyBadge value={acc} size="sm" />
        {block.wrong > 0 && (
          <Link
            to={`/${subject}/note/new?session=${sessionId}&taskType=${block.taskType}`}
            className="text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            记笔记
          </Link>
        )}
      </div>
    </div>
  );
}
