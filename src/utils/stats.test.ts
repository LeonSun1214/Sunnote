import { describe, expect, it } from 'vitest';
import type { ObjectiveBlock, Session } from '../types';
import {
  accuracy,
  blocksAccuracy,
  byTaskType,
  itemsNeededToPass,
  moduleAccuracy,
  routerStat,
  studyStreak,
  weakestTaskTypes,
} from './stats';

function block(partial: Partial<ObjectiveBlock>): ObjectiveBlock {
  return {
    id: Math.random().toString(36).slice(2),
    module: 'router',
    taskType: 'conversations',
    total: 10,
    wrong: 0,
    ...partial,
  };
}

function session(partial: Partial<Session>): Session {
  return {
    id: Math.random().toString(36).slice(2),
    subject: 'listening',
    setName: '模考',
    date: '2026-08-01',
    blocks: [],
    tasks: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...partial,
  };
}

describe('accuracy', () => {
  it('算基本正确率', () => {
    expect(accuracy(20, 6)).toBeCloseTo(0.7);
  });

  it('题数为 0 返回 null，不能当成 0%', () => {
    expect(accuracy(0, 0)).toBeNull();
  });

  it('全错是 0，不是 null', () => {
    expect(accuracy(10, 10)).toBe(0);
  });

  it('错题数超过总数时按总数封顶，不出现负正确率', () => {
    expect(accuracy(10, 15)).toBe(0);
  });

  it('负数错题按 0 处理', () => {
    expect(accuracy(10, -3)).toBe(1);
  });
});

describe('blocksAccuracy', () => {
  it('按题数加权合并，而不是对各自正确率取平均', () => {
    const blocks = [
      block({ total: 18, wrong: 0 }),
      block({ total: 2, wrong: 2 }),
    ];
    // 加权：18/20 = 90%。若取正确率平均会是 (100% + 0%) / 2 = 50%，那是错的。
    expect(blocksAccuracy(blocks)).toBeCloseTo(0.9);
  });

  it('空数组返回 null', () => {
    expect(blocksAccuracy([])).toBeNull();
  });
});

describe('moduleAccuracy', () => {
  it('只统计指定模块的题组', () => {
    const s = session({
      blocks: [
        block({ module: 'router', total: 20, wrong: 4 }),
        block({ module: 'upper', total: 15, wrong: 9 }),
      ],
    });
    expect(moduleAccuracy(s, 'router')).toBeCloseTo(0.8);
    expect(moduleAccuracy(s, 'upper')).toBeCloseTo(0.4);
    expect(moduleAccuracy(s, 'lower')).toBeNull();
  });
});

describe('routerStat', () => {
  it('按 70% 门槛统计达线率', () => {
    const sessions = [
      // 16/20 = 80% 达线
      session({ id: 'a', blocks: [block({ module: 'router', total: 20, wrong: 4 })] }),
      // 13/20 = 65% 没达线
      session({ id: 'b', blocks: [block({ module: 'router', total: 20, wrong: 7 })] }),
      // 14/20 = 70% 刚好达线（边界算通过）
      session({ id: 'c', blocks: [block({ module: 'router', total: 20, wrong: 6 })] }),
    ];
    const stat = routerStat(sessions, 0.7);
    expect(stat.attempts).toBe(3);
    expect(stat.passes).toBe(2);
    expect(stat.passRate).toBeCloseTo(2 / 3);
    expect(stat.averageAccuracy).toBeCloseTo((60 - 17) / 60);
  });

  it('没有 Router 数据时达线率为 null', () => {
    expect(routerStat([], 0.7).passRate).toBeNull();
  });
});

describe('itemsNeededToPass', () => {
  it('Router 20 题、门槛 70% 需要答对 14 题', () => {
    expect(itemsNeededToPass(20, 0.7)).toBe(14);
  });

  it('向上取整，不能少答', () => {
    expect(itemsNeededToPass(15, 0.7)).toBe(11); // 10.5 → 11
  });
});

describe('byTaskType / weakestTaskTypes', () => {
  const sessions = [
    session({
      id: 's1',
      blocks: [
        block({ taskType: 'conversations', total: 10, wrong: 1 }),
        block({ taskType: 'academic_talks', total: 10, wrong: 6 }),
      ],
    }),
    session({
      id: 's2',
      blocks: [block({ taskType: 'conversations', total: 10, wrong: 3 })],
    }),
  ];

  it('跨练习累加同一题型', () => {
    const stats = byTaskType(sessions);
    const conv = stats.find((s) => s.taskType === 'conversations');
    expect(conv?.total).toBe(20);
    expect(conv?.wrong).toBe(4);
    expect(conv?.accuracy).toBeCloseTo(0.8);
    expect(conv?.sessionCount).toBe(2);
  });

  it('弱的排前面', () => {
    expect(weakestTaskTypes(sessions)[0].taskType).toBe('academic_talks');
  });

  it('样本太小的题型不进排行，避免 1 题定生死', () => {
    const tiny = [session({ blocks: [block({ taskType: 'vocabulary', total: 2, wrong: 2 })] })];
    expect(weakestTaskTypes(tiny, 5)).toHaveLength(0);
  });
});

describe('studyStreak', () => {
  it('连续三天算 3', () => {
    const sessions = [
      session({ date: '2026-08-26' }),
      session({ date: '2026-08-25' }),
      session({ date: '2026-08-24' }),
    ];
    expect(studyStreak(sessions, new Date('2026-08-26T12:00:00'))).toBe(3);
  });

  it('今天没练但昨天练了，连续不算断', () => {
    const sessions = [session({ date: '2026-08-25' }), session({ date: '2026-08-24' })];
    expect(studyStreak(sessions, new Date('2026-08-26T12:00:00'))).toBe(2);
  });

  it('断了两天以上归零', () => {
    const sessions = [session({ date: '2026-08-20' })];
    expect(studyStreak(sessions, new Date('2026-08-26T12:00:00'))).toBe(0);
  });

  it('同一天多次练习只算一天', () => {
    const sessions = [session({ date: '2026-08-26' }), session({ date: '2026-08-26' })];
    expect(studyStreak(sessions, new Date('2026-08-26T12:00:00'))).toBe(1);
  });
});
