import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 阅读：与听力同为两段自适应。
 * Router 20 题 → Upper 15 题 或 Lower 15 题，必答共 35 题；加试题不计分，不录入。
 *
 *                    Router  Upper  Lower
 *   词汇填空            10     10     10
 *   短篇实用文本         5      —      5
 *   学术长文             5      5      —
 *                    ────────────────────
 *                       20     15     15
 *
 * 和听力同一个规律：Upper 砍掉偏日常的短篇文本、Lower 砍掉偏学术的长文。
 */
export const readingConfig: SubjectConfig = {
  key: 'reading',
  label: '阅读',
  labelEn: 'Reading',
  adaptive: true,
  color: 'reading',
  blurb: 'Router 20 题 → Upper / Lower 各 15 题，必答共 35 题。加试题不计分，不用记。',
  routingThreshold: 0.7,
  modules: [
    {
      key: 'router',
      label: 'Router',
      minutes: 20,
      scoredItems: 20,
      hint: '三种题型混合，中等难度。决定后面走 Upper 还是 Lower。',
    },
    {
      key: 'upper',
      label: 'Upper',
      minutes: 9,
      scoredItems: 15,
      maxBand: 6,
      hint: '高分模块，只有词汇和学术长文，没有短篇实用文本。封顶 Band 6。',
    },
    {
      key: 'lower',
      label: 'Lower',
      minutes: 9,
      scoredItems: 15,
      maxBand: 4,
      hint: '低分模块，只有词汇和短篇实用文本，没有学术长文。封顶 Band 4。',
    },
  ],
  taskTypes: [
    {
      key: 'vocabulary',
      label: '词汇填空',
      labelEn: 'Vocabulary',
      kind: 'objective',
      items: { router: 10, upper: 10, lower: 10 },
      hint: '选词填入短文。三个模块都是 10 题，占比最大 —— 错了的词记得进生词本。',
    },
    {
      key: 'short_texts',
      label: '短篇实用文本',
      labelEn: 'Short Texts',
      kind: 'objective',
      items: { router: 5, lower: 5 },
      hint: '通知、邮件、告示这类真实场景文本。Upper 模块没有这个题型。',
    },
    {
      key: 'academic_passages',
      label: '学术长文',
      labelEn: 'Academic Passages',
      kind: 'objective',
      items: { router: 5, upper: 5 },
      hint: '主旨、细节、推断、修辞目的。Lower 模块没有这个题型。',
    },
  ],
};
