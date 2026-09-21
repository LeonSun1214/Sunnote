import type { SubjectConfig } from '../../../types';
import { IELTS_BAND_OPTIONS, IELTS_SCORE_SCALE } from './bands';

/**
 * 雅思写作（学术类）：两个 Task，共 60 分钟。
 * Task 2 在总分里的权重是 Task 1 的两倍，所以时间该往 Task 2 倾斜。
 *
 * 评分维度用官方的四项评分标准原文 —— 对着这四条自评，比笼统打个分有用。
 */
export const ieltsWritingConfig: SubjectConfig = {
  key: 'ielts-writing',
  exam: 'ielts',
  skill: 'writing',
  label: '写作',
  labelEn: 'Writing',
  adaptive: false,
  color: 'writing',
  blurb: 'Task 1 图表报告（20 分钟 ≥150 词）+ Task 2 议论文（40 分钟 ≥250 词）。Task 2 权重更高。',
  bandOptions: IELTS_BAND_OPTIONS,
  taskTypes: [
    {
      key: 'task1',
      label: 'Task 1 图表报告',
      labelEn: 'Academic Task 1',
      kind: 'subjective',
      minutes: 20,
      wordRange: [150, 200],
      scoreScale: IELTS_SCORE_SCALE,
      hint: '20 分钟，至少 150 词。描述图表数据，不要加入个人观点。',
      rubric: [
        { id: 'task_achievement', label: 'Task Achievement 没答全/漏了关键数据' },
        { id: 'overview', label: '没写总体概述段' },
        { id: 'coherence', label: 'Coherence and Cohesion 结构松散/连接词生硬' },
        { id: 'lexical', label: 'Lexical Resource 词汇重复/用词不准' },
        { id: 'grammar', label: 'Grammatical Range 句式单一/语法错误' },
        { id: 'opinion', label: '加了主观评论（Task 1 不该有）' },
        { id: 'word_count', label: '不足 150 词' },
        { id: 'time', label: '超过 20 分钟' },
      ],
    },
    {
      key: 'task2',
      label: 'Task 2 议论文',
      labelEn: 'Task 2 Essay',
      kind: 'subjective',
      minutes: 40,
      wordRange: [250, 320],
      scoreScale: IELTS_SCORE_SCALE,
      hint: '40 分钟，至少 250 词。权重是 Task 1 的两倍。',
      rubric: [
        { id: 'task_response', label: 'Task Response 没回应题目所有部分' },
        { id: 'position', label: '立场不清晰/前后摇摆' },
        { id: 'development', label: '论点没展开、缺例子' },
        { id: 'coherence', label: 'Coherence and Cohesion 段落逻辑断裂' },
        { id: 'lexical', label: 'Lexical Resource 词汇重复/用词不准' },
        { id: 'grammar', label: 'Grammatical Range 句式单一/语法错误' },
        { id: 'template', label: '套用模板痕迹重（可能被判 Task Response 上限）' },
        { id: 'word_count', label: '不足 250 词' },
        { id: 'time', label: '时间不够，结论草草收尾' },
      ],
    },
  ],
};
