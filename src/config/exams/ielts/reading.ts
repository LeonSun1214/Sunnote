import type { SubjectConfig } from '../../../types';
import { ACADEMIC_READING_BANDS, IELTS_BAND_OPTIONS } from './bands';

/**
 * 雅思阅读（学术类）：3 篇长文，共 40 题，60 分钟。
 *
 * 每篇的题数是浮动的 —— 13/13/14 最常见，但也有 14/13/13 之类的分法。
 * 所以三篇都开了 editableTotal：预填常见值，对不上时直接改。这是雅思和
 * 托福最大的差别（托福的题数是定死的，所以只填错题数）。
 */
export const ieltsReadingConfig: SubjectConfig = {
  key: 'ielts-reading',
  exam: 'ielts',
  skill: 'reading',
  label: '阅读',
  labelEn: 'Reading',
  adaptive: false,
  color: 'reading',
  blurb: '3 篇学术长文共 40 题，60 分钟。每篇题数会浮动，预填的数字可以改。',
  bandOptions: IELTS_BAND_OPTIONS,
  bandTable: ACADEMIC_READING_BANDS,
  taskTypes: [
    {
      key: 'passage1',
      label: 'Passage 1',
      kind: 'objective',
      items: { none: 13 },
      editableTotal: true,
      hint: '通常最容易，多是判断题和填空题。',
    },
    {
      key: 'passage2',
      label: 'Passage 2',
      kind: 'objective',
      items: { none: 13 },
      editableTotal: true,
      hint: '难度上一个台阶，配对题、段落信息题常见。',
    },
    {
      key: 'passage3',
      label: 'Passage 3',
      kind: 'objective',
      items: { none: 14 },
      editableTotal: true,
      hint: '最难，论证类文章多，时间也最紧。',
    },
  ],
};
