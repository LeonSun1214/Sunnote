import { describe, expect, it } from 'vitest';
import type { ModuleKind } from '../../types';
import { SUBJECT_LIST, SUBJECT_CONFIGS } from './index';

/**
 * 题数现在写死在 config 里，录入界面直接用。写错一个数字，正确率就会一直算错，
 * 而且不会有任何报错 —— 所以这些自洽性检查比看起来重要。
 */
describe('科目配置自洽性', () => {
  for (const config of SUBJECT_LIST) {
    describe(config.label, () => {
      if (!config.adaptive) {
        it('非自适应科目的客观题都用 none 键', () => {
          for (const t of config.taskTypes.filter((t) => t.kind === 'objective')) {
            expect(t.items?.none, `${t.label} 应有 none 题数`).toBeGreaterThan(0);
          }
        });
        return;
      }

      it('每个模块的各题型题数之和等于该模块的必答题数', () => {
        for (const module of config.modules ?? []) {
          const sum = config.taskTypes
            .filter((t) => t.kind === 'objective')
            .reduce((acc, t) => acc + (t.items?.[module.key] ?? 0), 0);
          expect(sum, `${config.label} ${module.label} 各题型合计`).toBe(module.scoredItems);
        }
      });

      it('客观题都声明了 items', () => {
        for (const t of config.taskTypes.filter((t) => t.kind === 'objective')) {
          expect(t.items, `${t.label} 缺 items`).toBeDefined();
        }
      });

      it('items 的键只能是本科目实际存在的模块', () => {
        const known = new Set((config.modules ?? []).map((m) => m.key as string));
        for (const t of config.taskTypes.filter((t) => t.kind === 'objective')) {
          for (const key of Object.keys(t.items ?? {})) {
            expect(known.has(key), `${t.label} 里的 ${key} 不是本科目的模块`).toBe(true);
          }
        }
      });

      it('每个模块至少有两个题型，不然分流没意义', () => {
        for (const module of config.modules ?? []) {
          const n = config.taskTypes.filter((t) => (t.items?.[module.key] ?? 0) > 0).length;
          expect(n, `${module.label} 的题型数`).toBeGreaterThanOrEqual(2);
        }
      });
    });
  }
});

/** 这几条是用户从真实试卷里核对出来的，写成断言防止以后被误改。 */
describe('听力题数分布', () => {
  const t = (key: string) => SUBJECT_CONFIGS.listening.taskTypes.find((x) => x.key === key)!.items!;

  it('Router 20 题：选回应 8、对话 4、通知 4、讲座 4', () => {
    expect(t('choose_a_response').router).toBe(8);
    expect(t('conversations').router).toBe(4);
    expect(t('announcements').router).toBe(4);
    expect(t('academic_talks').router).toBe(4);
  });

  it('Upper 15 题：选回应 3、对话 4、讲座 8，没有通知', () => {
    expect(t('choose_a_response').upper).toBe(3);
    expect(t('conversations').upper).toBe(4);
    expect(t('academic_talks').upper).toBe(8);
    expect(t('announcements').upper).toBeUndefined();
  });

  it('Lower 15 题：选回应 7、对话 4、通知 4，没有讲座', () => {
    expect(t('choose_a_response').lower).toBe(7);
    expect(t('conversations').lower).toBe(4);
    expect(t('announcements').lower).toBe(4);
    expect(t('academic_talks').lower).toBeUndefined();
  });
});

describe('阅读题数分布', () => {
  const t = (key: string) => SUBJECT_CONFIGS.reading.taskTypes.find((x) => x.key === key)!.items!;

  it('Router 20 题：词汇 10、短篇 5、长文 5', () => {
    expect(t('vocabulary').router).toBe(10);
    expect(t('short_texts').router).toBe(5);
    expect(t('academic_passages').router).toBe(5);
  });

  it('Upper 15 题：词汇 10、长文 5，没有短篇', () => {
    expect(t('vocabulary').upper).toBe(10);
    expect(t('academic_passages').upper).toBe(5);
    expect(t('short_texts').upper).toBeUndefined();
  });

  it('Lower 15 题：词汇 10、短篇 5，没有长文', () => {
    expect(t('vocabulary').lower).toBe(10);
    expect(t('short_texts').lower).toBe(5);
    expect(t('academic_passages').lower).toBeUndefined();
  });
});

describe('模块可用性由 items 的键决定', () => {
  it('听力的通知不进 Upper、讲座不进 Lower', () => {
    const types = SUBJECT_CONFIGS.listening.taskTypes;
    expect(types.find((t) => t.key === 'announcements')!.items).not.toHaveProperty('upper');
    expect(types.find((t) => t.key === 'academic_talks')!.items).not.toHaveProperty('lower');
  });

  it('阅读的短篇不进 Upper、长文不进 Lower', () => {
    const types = SUBJECT_CONFIGS.reading.taskTypes;
    expect(types.find((t) => t.key === 'short_texts')!.items).not.toHaveProperty('upper');
    expect(types.find((t) => t.key === 'academic_passages')!.items).not.toHaveProperty('lower');
  });
});

/** 模块题数本身也要对得上：Router 20 + Upper/Lower 15 = 必答 35。 */
describe('模块题数', () => {
  it('听力和阅读都是 Router 20 + 第二模块 15 = 35', () => {
    for (const key of ['listening', 'reading'] as const) {
      const modules = SUBJECT_CONFIGS[key].modules!;
      const byKey = (k: ModuleKind) => modules.find((m) => m.key === k)!.scoredItems;
      expect(byKey('router'), `${key} Router`).toBe(20);
      expect(byKey('upper'), `${key} Upper`).toBe(15);
      expect(byKey('lower'), `${key} Lower`).toBe(15);
      expect(byKey('router') + byKey('upper')).toBe(35);
    }
  });
});
