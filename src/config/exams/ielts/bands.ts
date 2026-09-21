import type { BandBracket } from '../../../types';

/**
 * 原始分（40 题里对几个）换算成 Band 的区间表。
 *
 * ⚠️ 雅思官方从不公布换算表，并且明确说过分数线会随每套题的难度浮动。
 * 下面这两张是网上通行、多个来源一致的版本，只能当**估算**用 —— 界面上
 * 也是这么标的。和托福那条 70% 分流线一个道理：写在 config 里，攒够自己
 * 的数据后想调就改这里。
 *
 * 听力学术类和培训类共用一张表；阅读两类不同，这里只有学术类。
 */

/** 听力：Academic 和 General Training 通用。 */
export const LISTENING_BANDS: BandBracket[] = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 32, max: 34, band: 7.5 },
  { min: 30, max: 31, band: 7.0 },
  { min: 26, max: 29, band: 6.5 },
  { min: 23, max: 25, band: 6.0 },
  { min: 18, max: 22, band: 5.5 },
  { min: 16, max: 17, band: 5.0 },
  { min: 13, max: 15, band: 4.5 },
  { min: 11, max: 12, band: 4.0 },
  { min: 8, max: 10, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 0, max: 3, band: 2.0 },
];

/** 阅读（学术类）。同样的原始分比听力要低半档到一档。 */
export const ACADEMIC_READING_BANDS: BandBracket[] = [
  { min: 39, max: 40, band: 9.0 },
  { min: 37, max: 38, band: 8.5 },
  { min: 35, max: 36, band: 8.0 },
  { min: 33, max: 34, band: 7.5 },
  { min: 30, max: 32, band: 7.0 },
  { min: 27, max: 29, band: 6.5 },
  { min: 23, max: 26, band: 6.0 },
  { min: 19, max: 22, band: 5.5 },
  { min: 15, max: 18, band: 5.0 },
  { min: 13, max: 14, band: 4.5 },
  { min: 10, max: 12, band: 4.0 },
  { min: 8, max: 9, band: 3.5 },
  { min: 6, max: 7, band: 3.0 },
  { min: 4, max: 5, band: 2.5 },
  { min: 0, max: 3, band: 2.0 },
];

/** 雅思四科通用的总分档位。0–9 半档共 19 个按钮太挤，取备考实际区间。 */
export const IELTS_BAND_OPTIONS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

/** 写作和口语都是 0–9 半档自评。 */
export const IELTS_SCORE_SCALE = { min: 0, max: 9, step: 0.5 };
