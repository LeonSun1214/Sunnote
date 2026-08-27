import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 写作：约 23 分钟，12 题，三个题型顺序固定。
 * Build a Sentence 是客观题（10 道语法题），可以直接数对错；
 * Email 和 Academic Discussion 是主观题，用自评分 + 字数 + 扣分维度记录。
 */
export const writingConfig: SubjectConfig = {
  key: 'writing',
  label: '写作',
  labelEn: 'Writing',
  adaptive: false,
  color: 'writing',
  blurb: 'Build a Sentence 10 题算正确率；Email 和学术讨论按自评分、字数、扣分点记录。',
  taskTypes: [
    {
      key: 'build_a_sentence',
      label: '造句',
      labelEn: 'Build a Sentence',
      kind: 'objective',
      items: { none: 10 },
      minutes: 6,
      hint: '10 道语法题，约 6 分钟，平均每题 35–40 秒。',
    },
    {
      key: 'write_an_email',
      label: '写邮件',
      labelEn: 'Write an Email',
      kind: 'subjective',
      minutes: 7,
      wordRange: [130, 140],
      hint: '7 分钟，130–140 词。',
      rubric: [
        { id: 'task_response', label: '没答全题目要求' },
        { id: 'tone', label: '语气/正式度不对' },
        { id: 'organization', label: '结构松散' },
        { id: 'grammar', label: '语法错误' },
        { id: 'vocabulary', label: '词汇单调/用词不准' },
        { id: 'word_count', label: '字数超/欠' },
        { id: 'time', label: '时间不够' },
      ],
    },
    {
      key: 'academic_discussion',
      label: '学术讨论',
      labelEn: 'Academic Discussion',
      kind: 'subjective',
      minutes: 10,
      wordRange: [100, 130],
      hint: '10 分钟，100–130 词。要回应教授问题并和同学观点互动。',
      rubric: [
        { id: 'task_response', label: '没回应教授的问题' },
        { id: 'engagement', label: '没和同学观点互动' },
        { id: 'reasoning', label: '论据薄弱/没展开' },
        { id: 'organization', label: '结构松散' },
        { id: 'grammar', label: '语法错误' },
        { id: 'vocabulary', label: '词汇单调/用词不准' },
        { id: 'word_count', label: '字数超/欠' },
        { id: 'time', label: '时间不够' },
      ],
    },
  ],
};
