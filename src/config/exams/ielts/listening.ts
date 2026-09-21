import type { SubjectConfig } from '../../../types';
import { IELTS_BAND_OPTIONS, LISTENING_BANDS } from './bands';

/**
 * 雅思听力：4 个 Part 各 10 题，共 40 题，30 分钟。
 * 学术类和培训类的听力完全一样。
 *
 * 不像托福那样按题型固定题数 —— 雅思每套的题型分布都不同（这套 Part 2 是
 * 地图题，下套可能是选择题）。所以按 Part 记：题数恒定 10，而且 Part 的
 * 难度梯度本身就有诊断价值（Part 1 填表不该错，Part 4 学术独白最难）。
 * 具体错在哪类题，记进错题笔记。
 */
export const ieltsListeningConfig: SubjectConfig = {
  key: 'ielts-listening',
  exam: 'ielts',
  skill: 'listening',
  label: '听力',
  labelEn: 'Listening',
  adaptive: false,
  color: 'listening',
  blurb: '4 个 Part 各 10 题，共 40 题，30 分钟。对题数会换算成估算 Band。',
  bandOptions: IELTS_BAND_OPTIONS,
  bandTable: LISTENING_BANDS,
  taskTypes: [
    {
      key: 'part1',
      label: 'Part 1',
      labelEn: 'Everyday conversation',
      kind: 'objective',
      items: { none: 10 },
      hint: '日常场景双人对话，多是填表、填号码日期。这部分不该丢分。',
    },
    {
      key: 'part2',
      label: 'Part 2',
      labelEn: 'Everyday monologue',
      kind: 'objective',
      items: { none: 10 },
      hint: '日常场景独白，地图题和配对题常出现在这里。',
    },
    {
      key: 'part3',
      label: 'Part 3',
      labelEn: 'Academic discussion',
      kind: 'objective',
      items: { none: 10 },
      hint: '学术场景多人讨论，语速快、观点来回切换。',
    },
    {
      key: 'part4',
      label: 'Part 4',
      labelEn: 'Academic monologue',
      kind: 'objective',
      items: { none: 10 },
      hint: '学术讲座独白，中间不停顿，通常最难。',
    },
  ],
};
