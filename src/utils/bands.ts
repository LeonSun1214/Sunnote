import type { BandBracket, SubjectConfig } from '../types';

/**
 * 按原始分（对了几题）估算 Band。
 *
 * 没有换算表（托福四科、雅思写作口语）返回 null —— 那几科的分数不是从
 * 对题数来的，硬给一个数字是误导。
 *
 * 强调「估算」：雅思官方不公布换算表，分数线随每套题难度浮动。这个函数
 * 的结果只用来给个参考，绝不自动覆盖用户手填的真实成绩。
 */
export function estimateBand(config: SubjectConfig, correct: number): number | null {
  const table = config.bandTable;
  if (!table || correct < 0) return null;
  const hit = table.find((b) => correct >= b.min && correct <= b.max);
  return hit?.band ?? null;
}

/** 这一科能不能按对题数估 Band。 */
export function hasBandTable(config: SubjectConfig): boolean {
  return Boolean(config.bandTable?.length);
}

/**
 * 换算表自洽性检查：区间必须从高到低、互不重叠、且连续无空洞。
 * 表是手抄的，抄错一行会让某个分数估不出来或估成相邻档。
 */
export function validateBandTable(table: BandBracket[]): string[] {
  const problems: string[] = [];
  for (let i = 0; i < table.length; i++) {
    const b = table[i];
    if (b.min > b.max) problems.push(`Band ${b.band} 的区间反了：${b.min}–${b.max}`);
    const next = table[i + 1];
    if (!next) continue;
    if (next.band >= b.band) problems.push(`Band 没有从高到低排：${b.band} 后面是 ${next.band}`);
    if (next.max !== b.min - 1) {
      problems.push(`Band ${b.band} 和 ${next.band} 之间不连续：${next.max} → ${b.min}`);
    }
  }
  return problems;
}
