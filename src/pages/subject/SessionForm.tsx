import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import type { AdaptivePath, ModuleKind, ObjectiveBlock, SubjectConfig, SubjectiveTask } from '../../types';
import { useAppData } from '../../store/hooks';
import { useSubjectParam } from './useSubjectParam';
import { ModulePathPicker } from '../../components/ModulePathPicker';
import { ObjectiveBlockInput } from '../../components/ObjectiveBlockInput';
import { SubjectiveTaskInput } from '../../components/SubjectiveTaskInput';
import { AccuracyBadge } from '../../components/AccuracyBadge';
import {
  activeModules,
  blockKey,
  initialBlocks,
  initialTasks,
  isTaskTypeAvailable,
  pruneBlocks,
  pruneTasks,
} from './sessionDraft';
import { blocksAccuracy, blocksTotals, itemsNeededToPass } from '../../utils/stats';
import { todayKey } from '../../utils/date';
import { SUBJECT_STYLES, cx } from '../../utils/ui';

/**
 * 换科目只是 hash 变化，React Router 认为还是同一个路由组件、不会重新挂载，
 * 表单里那些只在挂载时算一次的初始状态就会留着上一科的题组。
 * 用 key 把科目和记录 id 绑进组件身份，切换时强制重挂载。
 */
export function SessionForm() {
  const config = useSubjectParam();
  const { sessionId } = useParams();

  if (!config) return <Navigate to="/" replace />;
  return <SessionFormInner key={`${config.key}:${sessionId ?? 'new'}`} config={config} sessionId={sessionId} />;
}

function SessionFormInner({ config, sessionId }: { config: SubjectConfig; sessionId?: string }) {
  const navigate = useNavigate();
  const { data, addSession, updateSession } = useAppData();

  const existing = sessionId ? data.sessions.find((s) => s.id === sessionId) : undefined;
  const isEdit = Boolean(sessionId);

  const [setName, setSetName] = useState(existing?.setName ?? '');
  const [date, setDate] = useState(existing?.date?.slice(0, 10) ?? todayKey());
  const [path, setPath] = useState<AdaptivePath>(existing?.path ?? 'upper');
  const [band, setBand] = useState<number | undefined>(existing?.band);
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [touchedTasks, setTouchedTasks] = useState<Set<string>>(
    () => new Set(existing?.tasks.map((t) => t.id) ?? []),
  );

  const [blocks, setBlocks] = useState<Map<string, ObjectiveBlock>>(() => {
    const base = initialBlocks(config, existing?.path ?? 'upper');
    for (const block of existing?.blocks ?? []) {
      base.set(blockKey(block.module, block.taskType), { ...block });
    }
    return base;
  });

  const [tasks, setTasks] = useState<SubjectiveTask[]>(() => {
    if (existing && existing.tasks.length > 0) {
      // 编辑时保留已存的题，再把 config 里新增但这条记录没有的题补齐
      const fresh = initialTasks(config);
      const byType = new Map<string, SubjectiveTask[]>();
      for (const t of existing.tasks) {
        const list = byType.get(t.taskType) ?? [];
        list.push(t);
        byType.set(t.taskType, list);
      }
      return fresh.map((placeholder) => byType.get(placeholder.taskType)?.shift() ?? placeholder);
    }
    return initialTasks(config);
  });

  const modules = useMemo(() => activeModules(config, path), [config, path]);

  if (isEdit && !existing) return <Navigate to={`/${config.key}`} replace />;

  const style = SUBJECT_STYLES[config.key];
  const objectiveTypes = config.taskTypes.filter((t) => t.kind === 'objective');
  const subjectiveTypes = config.taskTypes.filter((t) => t.kind === 'subjective');

  const visibleBlocks = config.adaptive
    ? modules.flatMap((m) =>
        objectiveTypes
          .filter((t) => isTaskTypeAvailable(t, m))
          .map((t) => blocks.get(blockKey(m, t.key)))
          .filter((b): b is ObjectiveBlock => Boolean(b)),
      )
    : objectiveTypes.map((t) => blocks.get(blockKey(null, t.key))).filter((b): b is ObjectiveBlock => Boolean(b));

  const overall = blocksAccuracy(visibleBlocks);
  const overallTotals = blocksTotals(visibleBlocks);

  const patchBlock = (key: string, patch: Partial<ObjectiveBlock>) => {
    setBlocks((prev) => {
      const next = new Map(prev);
      const current = next.get(key);
      if (current) next.set(key, { ...current, ...patch });
      return next;
    });
  };

  const patchTask = (id: string, patch: Partial<SubjectiveTask>) => {
    setTouchedTasks((prev) => new Set(prev).add(id));
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const changePath = (next: AdaptivePath) => {
    setPath(next);
    // 切换走向时补上新模块的题组，已填的保留 —— 误点一下不该清空录入
    setBlocks((prev) => {
      const merged = new Map(initialBlocks(config, next));
      for (const [key, block] of prev) if (merged.has(key)) merged.set(key, block);
      return merged;
    });
  };

  // 题数由 config 固定，overallTotals.total 恒大于 0，所以只看套题名填了没有
  const canSave = setName.trim().length > 0;

  const handleSave = () => {
    const payload = {
      subject: config.key,
      setName: setName.trim(),
      date,
      path: config.adaptive ? path : undefined,
      blocks: pruneBlocks(blocks),
      tasks: pruneTasks(tasks, touchedTasks),
      band,
      summary: summary.trim() || undefined,
    };
    if (existing) {
      updateSession(existing.id, payload);
      navigate(`/${config.key}/session/${existing.id}`);
    } else {
      const created = addSession(payload);
      navigate(`/${config.key}/session/${created.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <button type="button" className="mb-2 text-xs text-slate-500 hover:underline dark:text-slate-400" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="text-xl font-semibold">
          {isEdit ? '编辑' : '新建'}
          <span className={cx('ml-1.5', style.text)}>{config.label}</span>练习
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{config.blurb}</p>
      </header>

      <div className="card grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">套题名称</span>
          <input
            className="input"
            placeholder="如：官方模考 2 / Adaptive Practice 05"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            autoFocus={!isEdit}
          />
        </div>
        <div>
          <span className="label">练习日期</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {config.adaptive && <ModulePathPicker config={config} value={path} onChange={changePath} />}

      {config.adaptive
        ? modules.map((module) => (
            <ModuleSection
              key={module}
              module={module}
              config={config}
              blocks={blocks}
              onPatch={patchBlock}
            />
          ))
        : objectiveTypes.length > 0 && (
            <section className="card space-y-3">
              <h2 className="text-sm font-semibold">客观题</h2>
              {objectiveTypes.map((taskType) => {
                const key = blockKey(null, taskType.key);
                const block = blocks.get(key);
                if (!block) return null;
                return (
                  <ObjectiveBlockInput
                    key={key}
                    config={taskType}
                    block={block}
                    onChange={(patch) => patchBlock(key, patch)}
                  />
                );
              })}
            </section>
          )}

      {subjectiveTypes.map((taskType) => {
        const items = tasks.filter((t) => t.taskType === taskType.key);
        if (items.length === 0) return null;
        return (
          <section key={taskType.key} className="card space-y-3">
            <h2 className="text-sm font-semibold">
              {taskType.label}
              {items.length > 1 && <span className="ml-1 text-slate-400 dark:text-slate-500">· {items.length} 题</span>}
            </h2>
            {items.map((task, i) => (
              <SubjectiveTaskInput
                key={task.id}
                config={taskType}
                task={task}
                index={items.length > 1 ? i + 1 : undefined}
                onChange={(patch) => patchTask(task.id, patch)}
              />
            ))}
          </section>
        );
      })}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">这套的总正确率</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              共 {overallTotals.total} 题，错 {overallTotals.wrong} 题
            </p>
          </div>
          <AccuracyBadge value={overall} size="lg" />
        </div>

        <div>
          <span className="label">Band 得分（实际或自评，可留空）</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={band === b}
                onClick={() => setBand(band === b ? undefined : b)}
                className={cx(
                  'h-9 flex-1 rounded-lg border text-sm font-medium tabular-nums transition',
                  band === b
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600',
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">本次总结</span>
          <textarea
            className="input resize-y"
            rows={3}
            placeholder="这次哪里丢分最多？下次注意什么？"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
      </section>

      <div className="sticky bottom-20 flex gap-2 lg:bottom-4">
        <button type="button" className="btn-primary flex-1 shadow-lg" onClick={handleSave} disabled={!canSave}>
          {isEdit ? '保存修改' : '保存这次练习'}
        </button>
        <button type="button" className="btn-ghost bg-white shadow-lg dark:bg-slate-900" onClick={() => navigate(-1)}>
          取消
        </button>
      </div>
      {!canSave && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">填上套题名称才能保存</p>
      )}
    </div>
  );
}

/** 一个自适应模块（Router / Upper / Lower）的录入区。 */
function ModuleSection({
  module,
  config,
  blocks,
  onPatch,
}: {
  module: ModuleKind;
  config: SubjectConfig;
  blocks: Map<string, ObjectiveBlock>;
  onPatch: (key: string, patch: Partial<ObjectiveBlock>) => void;
}) {
  const moduleConfig = config.modules?.find((m) => m.key === module);
  if (!moduleConfig) return null;

  const objectiveTypes = config.taskTypes.filter((t) => t.kind === 'objective');
  const moduleBlocks = objectiveTypes
    .map((t) => blocks.get(blockKey(module, t.key)))
    .filter((b): b is ObjectiveBlock => Boolean(b));

  const { total, wrong } = blocksTotals(moduleBlocks);
  const acc = blocksAccuracy(moduleBlocks);
  const target = moduleConfig.scoredItems;

  const threshold = config.routingThreshold ?? 0.7;
  const needed = itemsNeededToPass(target, threshold);
  const isRouter = module === 'router';
  const correct = total - wrong;
  const passed = isRouter && total > 0 && acc !== null && acc >= threshold;

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h2 className="text-sm font-semibold">
            {moduleConfig.label}
            <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">
              {target} 题 · {moduleConfig.minutes} 分钟
              {moduleConfig.maxBand ? ` · 封顶 Band ${moduleConfig.maxBand}` : ''}
            </span>
          </h2>
          {moduleConfig.hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{moduleConfig.hint}</p>}
        </div>
        <AccuracyBadge value={acc} detail={{ total, wrong }} />
      </div>

      {isRouter && total > 0 && (
        <div
          className={cx(
            'rounded-lg border px-3 py-2 text-xs',
            passed
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
          )}
        >
          {passed
            ? `答对 ${correct} 题，过了 ${Math.round(threshold * 100)}% 分流线（需 ${needed} 题），能进 Upper。`
            : `答对 ${correct} 题，还差 ${Math.max(needed - correct, 0)} 题到 ${Math.round(threshold * 100)}% 分流线（需 ${needed} 题）。达不到就只能进 Lower，分数封顶 Band 4。`}
        </div>
      )}

      {objectiveTypes.map((taskType) => {
        const key = blockKey(module, taskType.key);
        const block = blocks.get(key);
        const available = isTaskTypeAvailable(taskType, module);

        if (!available) {
          return (
            <ObjectiveBlockInput
              key={key}
              config={taskType}
              block={{ id: key, module, taskType: taskType.key, total: 0, wrong: 0 }}
              onChange={() => {}}
              disabledReason={`${moduleConfig.label} 模块没有这个题型`}
            />
          );
        }
        if (!block) return null;
        return (
          <ObjectiveBlockInput
            key={key}
            config={taskType}
            block={block}
            onChange={(patch) => onPatch(key, patch)}
          />
        );
      })}
    </section>
  );
}
