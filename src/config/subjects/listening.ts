import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 听力：Router 20 题 → Upper 15 题 或 Lower 15 题，必答共 35 题。
 * 加试题不计分，不录入。
 */
export const listeningConfig: SubjectConfig = {
  key: 'listening',
  label: '听力',
  labelEn: 'Listening',
  adaptive: true,
  color: 'listening',
  blurb: 'Router 20 题定分流，之后进 Upper 或 Lower 各 15 题。必答共 35 题。',
  routingThreshold: 0.7,
  modules: [
    {
      key: 'router',
      label: 'Router',
      minutes: 18,
      scoredItems: 20,
      hint: '所有人都做，难度相同。这 20 题决定后面进 Upper 还是 Lower。',
    },
    {
      key: 'upper',
      label: 'Upper',
      minutes: 11,
      scoredItems: 15,
      maxBand: 6,
      hint: '高分模块，含 Academic Talks，封顶 Band 6。',
    },
    {
      key: 'lower',
      label: 'Lower',
      minutes: 7,
      scoredItems: 15,
      maxBand: 4,
      hint: '低分模块，没有 Academic Talks，封顶 Band 4。',
    },
  ],
  taskTypes: [
    {
      key: 'choose_a_response',
      label: '选回应',
      labelEn: 'Choose a Response',
      kind: 'objective',
      hint: '听一句话，选出最合适的回应。',
    },
    {
      key: 'conversations',
      label: '对话',
      labelEn: 'Conversations',
      kind: 'objective',
      hint: '校园场景对话。',
    },
    {
      key: 'announcements',
      label: '通知',
      labelEn: 'Announcements',
      kind: 'objective',
      hint: '广播、通告类短听力。',
    },
    {
      key: 'academic_talks',
      label: '学术讲座',
      labelEn: 'Academic Talks',
      kind: 'objective',
      // 只在 Router 和 Upper 出现，Lower 路径下界面会禁用它
      availableIn: ['router', 'upper'],
      hint: '只出现在 Router 和 Upper，Lower 模块没有这个题型。',
    },
  ],
};
