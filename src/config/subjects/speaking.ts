import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 口语：约 8 分钟，11 题。
 * Listen and Repeat 7 句跟读可以逐句判对错，走正确率；
 * Take an Interview 4 题各 45 秒、无准备时间，用自评分记录。
 */
export const speakingConfig: SubjectConfig = {
  key: 'speaking',
  label: '口语',
  labelEn: 'Speaking',
  adaptive: false,
  color: 'speaking',
  blurb: 'Listen and Repeat 7 句逐句打点算正确率；Take an Interview 4 题各 45 秒按维度自评。',
  taskTypes: [
    {
      key: 'listen_and_repeat',
      label: '跟读',
      labelEn: 'Listen and Repeat',
      kind: 'objective',
      items: { none: 7 },
      responseSeconds: 12,
      inputStyle: 'dots',
      hint: '7 句，每句听一遍复述一遍。点掉没复述准的那几句。',
    },
    {
      key: 'take_an_interview',
      label: '模拟采访',
      labelEn: 'Take an Interview',
      kind: 'subjective',
      responseSeconds: 45,
      count: 4,
      hint: '4 题，每题 45 秒，没有准备时间也不能记笔记。',
      rubric: [
        { id: 'fluency', label: '流利度（卡顿、重复）' },
        { id: 'coherence', label: '连贯性（逻辑跳跃）' },
        { id: 'grammar', label: '语法错误' },
        { id: 'vocabulary', label: '词汇贫乏' },
        { id: 'pronunciation', label: '发音/语调' },
        { id: 'content', label: '内容太少，说不满 45 秒' },
        { id: 'off_topic', label: '跑题' },
      ],
    },
  ],
};
