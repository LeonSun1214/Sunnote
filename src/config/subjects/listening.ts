import type { SubjectConfig } from '../../types';

/**
 * 新版 2026 听力：Router 20 题 → Upper 15 题 或 Lower 15 题，必答共 35 题。
 * 加试题不计分，不录入。
 *
 * 每个题型在每个模块下的题数是固定的，所以 items 里既写了题数、也表达了可用性：
 *
 *              Router  Upper  Lower
 *   选回应         8      3      7
 *   对话           4      4      4
 *   通知           4      —      4
 *   讲座           4      8      —
 *              ────────────────────
 *                 20     15     15
 *
 * 规律是 Upper 砍掉偏日常的通知、Lower 砍掉偏学术的讲座 —— 自适应本来就该这样分。
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
      hint: '高分模块，讲座占一半，没有通知。封顶 Band 6。',
    },
    {
      key: 'lower',
      label: 'Lower',
      minutes: 7,
      scoredItems: 15,
      maxBand: 4,
      hint: '低分模块，没有讲座。封顶 Band 4。',
    },
  ],
  taskTypes: [
    {
      key: 'choose_a_response',
      label: '选回应',
      labelEn: 'Choose a Response',
      kind: 'objective',
      items: { router: 8, upper: 3, lower: 7 },
      hint: '听一句话，选出最合适的回应。',
    },
    {
      key: 'conversations',
      label: '对话',
      labelEn: 'Conversation',
      kind: 'objective',
      items: { router: 4, upper: 4, lower: 4 },
      hint: '校园场景对话。三个模块都是 4 题。',
    },
    {
      key: 'announcements',
      label: '通知',
      labelEn: 'Announcement',
      kind: 'objective',
      items: { router: 4, lower: 4 },
      hint: '广播、通告类短听力。Upper 模块没有这个题型。',
    },
    {
      key: 'academic_talks',
      label: '讲座',
      labelEn: 'Lecture',
      kind: 'objective',
      items: { router: 4, upper: 8 },
      hint: '学术讲座。Lower 模块没有这个题型，Upper 里占到 8 题。',
    },
  ],
};
