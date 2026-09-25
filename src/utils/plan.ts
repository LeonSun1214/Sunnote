import type { Exam, ExamPlan } from '../types';
import { EXAM_ORDER } from '../config/exams';

/** 目标分的量程。托福是 0–120 的总分整数，雅思是 0–9 的半档 Band。 */
export interface TargetScale {
  min: number;
  max: number;
  step: number;
  /** 输入框旁边的一句说明。 */
  hint: string;
  placeholder: string;
}

export const TARGET_SCALES: Record<Exam, TargetScale> = {
  toefl: { min: 0, max: 120, step: 1, hint: '总分 0–120。', placeholder: '如 100' },
  ielts: { min: 0, max: 9, step: 0.5, hint: 'Band 0–9，半档。', placeholder: '如 7' },
};

/** 把任意数字收进该考试的量程：先按步进取整，再截到区间内。不是有限数返回 null。 */
export function clampTarget(exam: Exam, value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const { min, max, step } = TARGET_SCALES[exam];
  const snapped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/** 目标分的显示：托福「105 分」，雅思「Band 6.5」。 */
export function formatTarget(exam: Exam, target: number): string {
  return exam === 'ielts' ? `Band ${target}` : `${target} 分`;
}

/**
 * 从今天（本地日历日）到某个 YYYY-MM-DD 还有几天：今天 0，明天 1，昨天 -1。
 * 按两个本地午夜的差值取整 —— 夏令时那天少一小时也不会算成 0.96 天。
 * 不合法的日期返回 null，包括 2026-02-31 这种能 parse 但会滚到下个月的。
 */
export function daysUntil(dateKey: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const target = new Date(y, mo - 1, d);
  if (target.getFullYear() !== y || target.getMonth() !== mo - 1 || target.getDate() !== d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExamPlans = Partial<Record<Exam, ExamPlan>>;

/**
 * 不可信数据（localStorage、导入的备份）进入系统时的归一化，和 migrate 里
 * 其它字段一个道理：日期不合法就丢，目标分收进量程，两项都没有的考试整个去掉。
 * 一个都不剩就返回 undefined，让 settings 里根本没有 plans 这个键。
 */
export function normalizePlans(raw: unknown): ExamPlans | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const source = raw as Record<string, unknown>;
  const result: ExamPlans = {};
  for (const exam of EXAM_ORDER) {
    const entry = source[exam];
    if (!entry || typeof entry !== 'object') continue;
    const { date, target } = entry as { date?: unknown; target?: unknown };
    const plan: ExamPlan = {};
    if (typeof date === 'string' && daysUntil(date) !== null) plan.date = date;
    if (typeof target === 'number') {
      const clamped = clampTarget(exam, target);
      if (clamped !== null) plan.target = clamped;
    }
    if (plan.date !== undefined || plan.target !== undefined) result[exam] = plan;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export interface UpcomingExam {
  exam: Exam;
  date: string;
  /** 距今天数，今天为 0。 */
  days: number;
  target?: number;
}

/**
 * 最近的一场还没考的考试（今天也算），仪表盘顶部只显示这一场。
 * 已经过去的日期不算 —— 倒计时倒完了就该从仪表盘上消失，而不是显示负数。
 * 同一天两场按 EXAM_ORDER 的顺序取前面那个。
 */
export function nearestExamPlan(plans: ExamPlans | undefined, now = new Date()): UpcomingExam | null {
  if (!plans) return null;
  let best: UpcomingExam | null = null;
  for (const exam of EXAM_ORDER) {
    const plan = plans[exam];
    if (!plan?.date) continue;
    const days = daysUntil(plan.date, now);
    if (days === null || days < 0) continue;
    if (!best || days < best.days) best = { exam, date: plan.date, days, target: plan.target };
  }
  return best;
}
