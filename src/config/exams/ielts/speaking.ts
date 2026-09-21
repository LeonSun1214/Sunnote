import type { SubjectConfig } from '../../../types';
import { IELTS_BAND_OPTIONS, IELTS_SCORE_SCALE } from './bands';

/**
 * 雅思口语：三个 Part，全程 11–14 分钟，和考官面对面（或视频）。
 * 评分维度是官方那四项，四项等权重取平均。
 */
export const ieltsSpeakingConfig: SubjectConfig = {
  key: 'ielts-speaking',
  exam: 'ielts',
  skill: 'speaking',
  label: '口语',
  labelEn: 'Speaking',
  adaptive: false,
  color: 'speaking',
  blurb: 'Part 1 日常问答 / Part 2 个人陈述 / Part 3 深入讨论，全程 11–14 分钟。',
  bandOptions: IELTS_BAND_OPTIONS,
  taskTypes: [
    {
      key: 'part1',
      label: 'Part 1 日常问答',
      labelEn: 'Introduction and interview',
      kind: 'subjective',
      minutes: 5,
      scoreScale: IELTS_SCORE_SCALE,
      hint: '4–5 分钟。家庭、工作、兴趣这类熟悉话题，每题答两三句就够，别背稿。',
      rubric: [
        { id: 'fluency', label: 'Fluency and Coherence 卡顿、重复、想词' },
        { id: 'lexical', label: 'Lexical Resource 词汇贫乏/用词不准' },
        { id: 'grammar', label: 'Grammatical Range and Accuracy 句式单一/语法错误' },
        { id: 'pronunciation', label: 'Pronunciation 发音、语调、连读' },
        { id: 'too_short', label: '答得太短，只回一个词' },
        { id: 'memorised', label: '背诵痕迹明显' },
      ],
    },
    {
      key: 'part2',
      label: 'Part 2 个人陈述',
      labelEn: 'Long turn (cue card)',
      kind: 'subjective',
      minutes: 4,
      responseSeconds: 120,
      scoreScale: IELTS_SCORE_SCALE,
      hint: '1 分钟准备，讲 1–2 分钟。卡片上的四个点都要覆盖到。',
      rubric: [
        { id: 'fluency', label: 'Fluency and Coherence 卡顿、重复、想词' },
        { id: 'lexical', label: 'Lexical Resource 词汇贫乏/用词不准' },
        { id: 'grammar', label: 'Grammatical Range and Accuracy 句式单一/语法错误' },
        { id: 'pronunciation', label: 'Pronunciation 发音、语调、连读' },
        { id: 'coverage', label: '卡片上的点没讲全' },
        { id: 'too_short', label: '不到 1 分钟就说完了' },
        { id: 'notes', label: '准备的一分钟没用好' },
      ],
    },
    {
      key: 'part3',
      label: 'Part 3 深入讨论',
      labelEn: 'Discussion',
      kind: 'subjective',
      minutes: 5,
      scoreScale: IELTS_SCORE_SCALE,
      hint: '4–5 分钟。围绕 Part 2 的话题往抽象和社会层面延伸，要给理由和例子。',
      rubric: [
        { id: 'fluency', label: 'Fluency and Coherence 卡顿、重复、想词' },
        { id: 'lexical', label: 'Lexical Resource 词汇贫乏/用词不准' },
        { id: 'grammar', label: 'Grammatical Range and Accuracy 句式单一/语法错误' },
        { id: 'pronunciation', label: 'Pronunciation 发音、语调、连读' },
        { id: 'depth', label: '答得太浅，没展开论证' },
        { id: 'abstract', label: '抽象话题答不上来' },
      ],
    },
  ],
};
