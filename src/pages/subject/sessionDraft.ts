import type {
  AdaptivePath,
  ModuleKind,
  ObjectiveBlock,
  SubjectConfig,
  SubjectiveTask,
  TaskTypeConfig,
} from '../../types';
import { newId } from '../../store/storage';

/** 题组在表单里的唯一键：模块 + 题型。 */
export function blockKey(module: ModuleKind | null, taskType: string): string {
  return `${module ?? 'none'}::${taskType}`;
}

/** 该题型在这个模块下有几题。返回 undefined 代表这个模块没有这个题型。 */
export function itemCount(config: TaskTypeConfig, module: ModuleKind | null): number | undefined {
  return config.items?.[module ?? 'none'];
}

/**
 * 该题型在这个模块里是否可用。
 * 题数表里没这一项就是没有 —— 听力的通知不进 Upper、阅读的学术长文不进 Lower 都靠这个。
 */
export function isTaskTypeAvailable(config: TaskTypeConfig, module: ModuleKind | null): boolean {
  return itemCount(config, module) !== undefined;
}

/** 当前走向下要展示的模块：Router 加上被分到的那一边。 */
export function activeModules(config: SubjectConfig, path: AdaptivePath): ModuleKind[] {
  if (!config.adaptive) return [];
  return ['router', path];
}

/**
 * 新题组默认「全错」，而不是全对。
 *
 * 题数固定之后，系统没法区分「我全对」和「我忘了填」。默认全对的话，漏填一个
 * 模块会让总正确率虚高，错误伪装成好成绩；默认全错则漏填立刻变成刺眼的低分，
 * 一眼就能发现。两种默认都会错，但只有这个方向会自己暴露出来。
 */
export function makeBlock(module: ModuleKind | null, taskType: string, total: number): ObjectiveBlock {
  return { id: newId(), module, taskType, total, wrong: total };
}

export function makeTask(taskType: string): SubjectiveTask {
  return { id: newId(), taskType, selfScore: 3, rubricHits: [] };
}

/** 新建练习时的初始表单状态。题数直接来自 config，不用录入者填。 */
export function initialBlocks(config: SubjectConfig, path: AdaptivePath): Map<string, ObjectiveBlock> {
  const map = new Map<string, ObjectiveBlock>();
  const objectiveTypes = config.taskTypes.filter((t) => t.kind === 'objective');
  const modules: (ModuleKind | null)[] = config.adaptive ? activeModules(config, path) : [null];

  for (const module of modules) {
    for (const taskType of objectiveTypes) {
      const total = itemCount(taskType, module);
      if (total === undefined) continue;
      map.set(blockKey(module, taskType.key), makeBlock(module, taskType.key, total));
    }
  }
  return map;
}

export function initialTasks(config: SubjectConfig): SubjectiveTask[] {
  return config.taskTypes
    .filter((t) => t.kind === 'subjective')
    .flatMap((t) => Array.from({ length: t.count ?? 1 }, () => makeTask(t.key)));
}

/**
 * 保存时丢掉题数为 0 的题组。
 * 题数现在由 config 决定，正常不会是 0；这层过滤是防 config 写错时脏数据进统计。
 * 注意「错 0 题」是有效数据，不能因为 wrong 为 0 就丢掉 —— 那是满分，不是没填。
 */
export function pruneBlocks(blocks: Map<string, ObjectiveBlock>): ObjectiveBlock[] {
  return [...blocks.values()].filter((b) => b.total > 0);
}

/** 主观题里完全没动过的（没打分也没写答案）不保存。 */
export function pruneTasks(tasks: SubjectiveTask[], touched: Set<string>): SubjectiveTask[] {
  return tasks.filter(
    (t) => touched.has(t.id) || Boolean(t.answer?.trim()) || t.rubricHits.length > 0 || Boolean(t.reflection?.trim()),
  );
}
