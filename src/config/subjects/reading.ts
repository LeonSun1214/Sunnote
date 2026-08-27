import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 阅读：与听力同为两段自适应。
 * Router 20 题 → Upper 15 题 或 Lower 15 题，必答共 35 题；另有 15 道加试题，不录入。
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
      hint: '学术内容更多、题目更绕，封顶 Band 6。',
    },
    {
      key: 'lower',
      label: 'Lower',
      minutes: 9,
      scoredItems: 15,
      maxBand: 4,
      hint: '日常内容更多、题目更直白，封顶 Band 4。',
    },
  ],
  taskTypes: [
    {
      key: 'vocabulary',
      label: '词汇填空',
      labelEn: 'Vocabulary',
      kind: 'objective',
      hint: '选词填入短文。错了的词记得进生词本。',
    },
    {
      key: 'short_texts',
      label: '短篇实用文本',
      labelEn: 'Short Texts',
      kind: 'objective',
      hint: '通知、邮件、告示这类真实场景文本，考快速定位。',
    },
    {
      key: 'academic_passages',
      label: '学术长文',
      labelEn: 'Academic Passages',
      kind: 'objective',
      hint: '主旨、细节、推断、修辞目的。',
    },
  ],
};
