import type {
  AdaptivePath,
  ModuleKind,
  ObjectiveBlock,
  Session,
  Subject,
  SubjectiveTask,
} from '../types';

/**
 * 正确率。题数为 0 时返回 null 而不是 0 —— 「没做过」和「全错」是两回事，
 * 混在一起会把平均值拉垮。所有聚合都要跳过 null。
 */
export function accuracy(total: number, wrong: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const clampedWrong = Math.min(Math.max(wrong, 0), total);
  return (total - clampedWrong) / total;
}

/** 把一组题组合并后再算正确率，而不是对各自的正确率取平均（题数不等时后者会失真）。 */
export function blocksAccuracy(blocks: ObjectiveBlock[]): number | null {
  const total = blocks.reduce((sum, b) => sum + Math.max(b.total, 0), 0);
  const wrong = blocks.reduce((sum, b) => sum + Math.min(Math.max(b.wrong, 0), Math.max(b.total, 0)), 0);
  return accuracy(total, wrong);
}

export function sessionAccuracy(session: Session): number | null {
  return blocksAccuracy(session.blocks);
}

export function moduleBlocks(session: Session, module: ModuleKind): ObjectiveBlock[] {
  return session.blocks.filter((b) => b.module === module);
}

export function moduleAccuracy(session: Session, module: ModuleKind): number | null {
  return blocksAccuracy(moduleBlocks(session, module));
}

export interface CountPair {
  total: number;
  wrong: number;
}

export function blocksTotals(blocks: ObjectiveBlock[]): CountPair {
  return blocks.reduce<CountPair>(
    (acc, b) => {
      const total = Math.max(b.total, 0);
      return {
        total: acc.total + total,
        wrong: acc.wrong + Math.min(Math.max(b.wrong, 0), total),
      };
    },
    { total: 0, wrong: 0 },
  );
}

export interface TaskTypeStat {
  subject: Subject;
  taskType: string;
  total: number;
  wrong: number;
  accuracy: number | null;
  /** 出现在几次练习里，用来判断样本量够不够。 */
  sessionCount: number;
}

/** 按题型聚合正确率。用于「薄弱题型排行」和每科统计页。 */
export function byTaskType(sessions: Session[]): TaskTypeStat[] {
  const map = new Map<string, TaskTypeStat & { sessionIds: Set<string> }>();

  for (const session of sessions) {
    for (const block of session.blocks) {
      const key = `${session.subject}::${block.taskType}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          subject: session.subject,
          taskType: block.taskType,
          total: 0,
          wrong: 0,
          accuracy: null,
          sessionCount: 0,
          sessionIds: new Set(),
        };
        map.set(key, entry);
      }
      const total = Math.max(block.total, 0);
      entry.total += total;
      entry.wrong += Math.min(Math.max(block.wrong, 0), total);
      entry.sessionIds.add(session.id);
    }
  }

  return [...map.values()].map(({ sessionIds, ...rest }) => ({
    ...rest,
    accuracy: accuracy(rest.total, rest.wrong),
    sessionCount: sessionIds.size,
  }));
}

/**
 * 薄弱题型排行：正确率低的排前面。
 * 只收题数达到 minItems 的题型，避免做了两题错一题就冲到榜首。
 */
export function weakestTaskTypes(sessions: Session[], minItems = 5): TaskTypeStat[] {
  return byTaskType(sessions)
    .filter((s) => s.total >= minItems && s.accuracy !== null)
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1));
}

export interface ModuleStat {
  module: ModuleKind;
  total: number;
  wrong: number;
  accuracy: number | null;
}

export function byModule(sessions: Session[]): ModuleStat[] {
  const order: ModuleKind[] = ['router', 'upper', 'lower'];
  return order
    .map((module) => {
      const blocks = sessions.flatMap((s) => s.blocks.filter((b) => b.module === module));
      const { total, wrong } = blocksTotals(blocks);
      return { module, total, wrong, accuracy: accuracy(total, wrong) };
    })
    .filter((s) => s.total > 0);
}

export interface RouterStat {
  /** 有 Router 数据的练习次数。 */
  attempts: number;
  /** Router 正确率达到门槛的次数。 */
  passes: number;
  /** 达线率。attempts 为 0 时是 null。 */
  passRate: number | null;
  /** 历次 Router 正确率的平均（按题数加权）。 */
  averageAccuracy: number | null;
}

/**
 * Router 达线率 —— 新版考试最关键的指标：达不了线就进不了 Upper，
 * 分数直接封顶 Band 4。
 */
export function routerStat(sessions: Session[], threshold: number): RouterStat {
  const withRouter = sessions
    .map((s) => ({ session: s, acc: moduleAccuracy(s, 'router') }))
    .filter((x): x is { session: Session; acc: number } => x.acc !== null);

  const allRouterBlocks = sessions.flatMap((s) => moduleBlocks(s, 'router'));
  const { total, wrong } = blocksTotals(allRouterBlocks);

  return {
    attempts: withRouter.length,
    passes: withRouter.filter((x) => x.acc >= threshold).length,
    passRate: withRouter.length === 0 ? null : withRouter.filter((x) => x.acc >= threshold).length / withRouter.length,
    averageAccuracy: accuracy(total, wrong),
  };
}

/** Router 达线所需的最少答对题数，用来在界面上显示「≥14/20」这种具体目标。 */
export function itemsNeededToPass(scoredItems: number, threshold: number): number {
  return Math.ceil(scoredItems * threshold);
}

export function pathDistribution(sessions: Session[]): Record<AdaptivePath, number> {
  return sessions.reduce<Record<AdaptivePath, number>>(
    (acc, s) => {
      if (s.path) acc[s.path] += 1;
      return acc;
    },
    { upper: 0, lower: 0 },
  );
}

export interface TrendPoint {
  date: string;
  setName: string;
  accuracy: number | null;
  band?: number;
  selfScore: number | null;
}

/** 按时间正序的趋势点，供折线图使用。 */
export function trend(sessions: Session[], limit?: number): TrendPoint[] {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const sliced = limit != null ? sorted.slice(-limit) : sorted;
  return sliced.map((s) => ({
    date: s.date,
    setName: s.setName,
    accuracy: sessionAccuracy(s),
    band: s.band,
    selfScore: averageSelfScore(s.tasks),
  }));
}

export function averageSelfScore(tasks: SubjectiveTask[]): number | null {
  if (tasks.length === 0) return null;
  const sum = tasks.reduce((acc, t) => acc + t.selfScore, 0);
  return sum / tasks.length;
}

export interface RubricStat {
  taskType: string;
  rubricId: string;
  count: number;
}

/** 主观题最常犯的扣分点，按次数降序。 */
export function rubricHitCounts(sessions: Session[]): RubricStat[] {
  const map = new Map<string, RubricStat>();
  for (const session of sessions) {
    for (const task of session.tasks) {
      for (const rubricId of task.rubricHits) {
        const key = `${task.taskType}::${rubricId}`;
        const entry = map.get(key) ?? { taskType: task.taskType, rubricId, count: 0 };
        entry.count += 1;
        map.set(key, entry);
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * 连续练习天数（含今天或昨天为止的一段）。
 * 昨天也算在内，这样今天还没开始练不会立刻显示中断。
 */
export function studyStreak(sessions: Session[], today = new Date()): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => s.date.slice(0, 10)));

  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 格式化成百分比字符串。null 显示为「—」，不要显示 0%。 */
export function formatAccuracy(value: number | null, digits = 0): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function sessionsBySubject(sessions: Session[], subject: Subject): Session[] {
  return sessions
    .filter((s) => s.subject === subject)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
