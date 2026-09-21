import { describe, expect, it } from 'vitest';
import { ACADEMIC_READING_BANDS, LISTENING_BANDS } from '../config/exams/ielts/bands';
import { SUBJECT_CONFIGS } from '../config/exams';
import { estimateBand, hasBandTable, validateBandTable } from './bands';

const listening = SUBJECT_CONFIGS['ielts-listening'];
const reading = SUBJECT_CONFIGS['ielts-reading'];

describe('换算表自洽性', () => {
  // 表是手抄的，抄错一行会让某个分数估不出来或落到相邻档，而且不会报错
  it('听力表：从高到低、连续、不重叠', () => {
    expect(validateBandTable(LISTENING_BANDS)).toEqual([]);
  });

  it('阅读表：从高到低、连续、不重叠', () => {
    expect(validateBandTable(ACADEMIC_READING_BANDS)).toEqual([]);
  });

  it('两张表都覆盖 0–40 每一个分数', () => {
    for (const table of [LISTENING_BANDS, ACADEMIC_READING_BANDS]) {
      for (let n = 0; n <= 40; n++) {
        const hit = table.find((b) => n >= b.min && n <= b.max);
        expect(hit, `${n} 分没有对应档位`).toBeDefined();
      }
    }
  });

  it('能发现抄错的表', () => {
    const broken = [
      { min: 39, max: 40, band: 9 },
      { min: 35, max: 37, band: 8.5 }, // 38 分掉进空洞了
    ];
    expect(validateBandTable(broken).length).toBeGreaterThan(0);
  });
});

describe('estimateBand', () => {
  it('听力 32 → 7.5，31 → 7.0（档位边界）', () => {
    expect(estimateBand(listening, 32)).toBe(7.5);
    expect(estimateBand(listening, 31)).toBe(7.0);
  });

  it('满分和零分都有值', () => {
    expect(estimateBand(listening, 40)).toBe(9.0);
    expect(estimateBand(listening, 0)).toBe(2.0);
  });

  it('同样是 30 分，听力和阅读落在不同档 —— 两张表确实不一样', () => {
    expect(estimateBand(listening, 30)).toBe(7.0);
    expect(estimateBand(reading, 30)).toBe(7.0);
    // 33 分才拉开差距：听力已经 7.5，阅读还要 33 才到 7.5
    expect(estimateBand(listening, 33)).toBe(7.5);
    expect(estimateBand(reading, 32)).toBe(7.0);
    expect(estimateBand(reading, 33)).toBe(7.5);
  });

  it('没有换算表的科目返回 null，不硬给一个数字', () => {
    // 托福四科和雅思写作口语的分数不是从对题数来的
    expect(estimateBand(SUBJECT_CONFIGS['toefl-listening'], 30)).toBeNull();
    expect(estimateBand(SUBJECT_CONFIGS['ielts-writing'], 30)).toBeNull();
    expect(estimateBand(SUBJECT_CONFIGS['ielts-speaking'], 30)).toBeNull();
  });

  it('负数返回 null', () => {
    expect(estimateBand(listening, -1)).toBeNull();
  });
});

describe('hasBandTable', () => {
  it('只有雅思听力和阅读有', () => {
    expect(hasBandTable(listening)).toBe(true);
    expect(hasBandTable(reading)).toBe(true);
    expect(hasBandTable(SUBJECT_CONFIGS['ielts-writing'])).toBe(false);
    expect(hasBandTable(SUBJECT_CONFIGS['toefl-reading'])).toBe(false);
  });
});
