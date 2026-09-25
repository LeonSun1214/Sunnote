import { describe, expect, it } from 'vitest';
import { clampTarget, daysUntil, nearestExamPlan, normalizePlans } from './plan';

/** 2026-09-25 下午 —— 带时分，确认按日历日算而不是按 24 小时。 */
const NOW = new Date(2026, 8, 25, 15, 30);

describe('daysUntil', () => {
  it('今天 0、明天 1、昨天 -1，按本地日历日算', () => {
    expect(daysUntil('2026-09-25', NOW)).toBe(0);
    expect(daysUntil('2026-09-26', NOW)).toBe(1);
    expect(daysUntil('2026-09-24', NOW)).toBe(-1);
    expect(daysUntil('2026-12-25', NOW)).toBe(91);
  });

  it('不合法的日期返回 null，包括能 parse 但会滚到下个月的', () => {
    expect(daysUntil('', NOW)).toBeNull();
    expect(daysUntil('2026/09/25', NOW)).toBeNull();
    expect(daysUntil('2026-02-31', NOW)).toBeNull();
    expect(daysUntil('2026-13-01', NOW)).toBeNull();
  });
});

describe('clampTarget', () => {
  it('托福收进 0–120 的整数', () => {
    expect(clampTarget('toefl', 125)).toBe(120);
    expect(clampTarget('toefl', -3)).toBe(0);
    expect(clampTarget('toefl', 100.4)).toBe(100);
    expect(clampTarget('toefl', 100)).toBe(100);
  });

  it('雅思收进 0–9 的半档', () => {
    expect(clampTarget('ielts', 6.5)).toBe(6.5);
    expect(clampTarget('ielts', 6.3)).toBe(6.5);
    expect(clampTarget('ielts', 6.2)).toBe(6);
    expect(clampTarget('ielts', 9.5)).toBe(9);
  });

  it('不是有限数返回 null', () => {
    expect(clampTarget('toefl', Number.NaN)).toBeNull();
    expect(clampTarget('ielts', Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('normalizePlans', () => {
  it('垃圾输入和没有任何有效计划时返回 undefined', () => {
    expect(normalizePlans(null)).toBeUndefined();
    expect(normalizePlans('x')).toBeUndefined();
    expect(normalizePlans({})).toBeUndefined();
    expect(normalizePlans({ gre: { date: '2026-10-01' } })).toBeUndefined();
    expect(normalizePlans({ toefl: {} })).toBeUndefined();
  });

  it('日期不合法就丢，目标分收进量程，两项都没有的考试去掉', () => {
    expect(
      normalizePlans({
        toefl: { date: '2026-02-31', target: 130 },
        ielts: { date: 'soon', target: 'seven' },
      }),
    ).toEqual({ toefl: { target: 120 } });
  });

  it('合法的原样保留', () => {
    const plans = { toefl: { date: '2026-10-18', target: 105 }, ielts: { target: 6.5 } };
    expect(normalizePlans(plans)).toEqual(plans);
  });
});

describe('nearestExamPlan', () => {
  const plans = {
    toefl: { date: '2026-11-01', target: 105 },
    ielts: { date: '2026-10-18', target: 7 },
  };

  it('取最近的一场；已过的和没填日期的不算', () => {
    expect(nearestExamPlan(plans, NOW)).toEqual({ exam: 'ielts', date: '2026-10-18', days: 23, target: 7 });
    expect(nearestExamPlan({ ...plans, ielts: { date: '2026-09-24' } }, NOW)?.exam).toBe('toefl');
    expect(nearestExamPlan({ ...plans, ielts: { target: 7 } }, NOW)?.exam).toBe('toefl');
  });

  it('今天也算还没考', () => {
    expect(nearestExamPlan({ toefl: { date: '2026-09-25' } }, NOW)?.days).toBe(0);
  });

  it('没填、或只剩已过的日期，就是 null', () => {
    expect(nearestExamPlan(undefined, NOW)).toBeNull();
    expect(nearestExamPlan({}, NOW)).toBeNull();
    expect(nearestExamPlan({ toefl: { date: '2026-09-01' } }, NOW)).toBeNull();
  });
});
