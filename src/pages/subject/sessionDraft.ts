import type {
  AdaptivePath,
  ModuleKind,
  ObjectiveBlock,
  Session,
  SubjectConfig,
  SubjectiveTask,
  TaskTypeConfig,
} from '../../types';
import { newId } from '../../store/storage';

/** 题组在表单里的唯一键：模块 + 题型。 */
export function blockKey(module: ModuleKind | null, taskType: string): string {
  return `${module ?? 'none'}::${taskType}`;
}

/** 该题型在这个模块里是否可用。Academic Talks 不进 Lower 就是靠这个。 */
export function isTaskTypeAvailable(config: TaskTypeConfig, module: ModuleKind | null): boolean {
  if (!config.availableIn || module === null) return true;
  return config.availableIn.includes(module);
}

/** 当前走向下要展示的模块：Router 加上被分到的那一边。 */
export function activeModules(config: SubjectConfig, path: AdaptivePath): ModuleKind[] {
  if (!config.adaptive) return [];
  return ['router', path];
}

/**
 * 从历史记录里取该题型上次的题数作为默认值。
 * 每套题的题型分布相对稳定，用自己的历史数据预填比凭空猜一个分配靠谱。
 */
export function lastKnownTotal(
  sessions: Session[],
  subject: string,
  module: ModuleKind | null,
  taskType: string,
): number {
  const candidates = sessions
    .filter((s) => s.subject === subject)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  for (const session of candidates) {
    const block = session.blocks.find((b) => b.module === module && b.taskType === taskType);
    if (block && block.total > 0) return block.total;
  }
  return 0;
}

export function makeBlock(module: ModuleKind | null, taskType: string, total: number): ObjectiveBlock {
  return { id: newId(), module, taskType, total, wrong: 0 };
}

export function makeTask(taskType: string): SubjectiveTask {
  return { id: newId(), taskType, selfScore: 3, rubricHits: [] };
}

/** 新建练习时的初始表单状态。 */
export function initialBlocks(
  config: SubjectConfig,
  path: AdaptivePath,
  sessions: Session[],
): Map<string, ObjectiveBlock> {
  const map = new Map<string, ObjectiveBlock>();
  const objectiveTypes = config.taskTypes.filter((t) => t.kind === 'objective');

  if (config.adaptive) {
    for (const module of activeModules(config, path)) {
      for (const taskType of objectiveTypes) {
        if (!isTaskTypeAvailable(taskType, module)) continue;
        const total = taskType.defaultTotal ?? lastKnownTotal(sessions, config.key, module, taskType.key);
        map.set(blockKey(module, taskType.key), makeBlock(module, taskType.key, total));
      }
    }
  } else {
    for (const taskType of objectiveTypes) {
      const total = taskType.defaultTotal ?? lastKnownTotal(sessions, config.key, null, taskType.key);
      map.set(blockKey(null, taskType.key), makeBlock(null, taskType.key, total));
    }
  }
  return map;
}

export function initialTasks(config: SubjectConfig): SubjectiveTask[] {
  return config.taskTypes
    .filter((t) => t.kind === 'subjective')
    .flatMap((t) => Array.from({ length: t.count ?? 1 }, () => makeTask(t.key)));
}

/** 保存时丢掉没填的题组（total 为 0），免得空数据污染统计。 */
export function pruneBlocks(blocks: Map<string, ObjectiveBlock>): ObjectiveBlock[] {
  return [...blocks.values()].filter((b) => b.total > 0);
}

/** 主观题里完全没动过的（没打分也没写答案）不保存。 */
export function pruneTasks(tasks: SubjectiveTask[], touched: Set<string>): SubjectiveTask[] {
  return tasks.filter(
    (t) => touched.has(t.id) || Boolean(t.answer?.trim()) || t.rubricHits.length > 0 || Boolean(t.reflection?.trim()),
  );
}
