import { describe, expect, it } from 'vitest';
import { listeningConfig } from '../../config/subjects/listening';
import { readingConfig } from '../../config/subjects/reading';
import { writingConfig } from '../../config/subjects/writing';
import { blockKey, initialBlocks, isTaskTypeAvailable, itemCount } from './sessionDraft';

describe('新建练习的初始题组', () => {
  it('题数来自 config，不用录入者填', () => {
    const blocks = initialBlocks(listeningConfig, 'upper');
    expect(blocks.get(blockKey('router', 'choose_a_response'))?.total).toBe(8);
    expect(blocks.get(blockKey('upper', 'academic_talks'))?.total).toBe(8);
  });

  it('默认全错而不是全对', () => {
    // 题数固定后，系统分不清「全对」和「忘了填」。默认全错的话漏填会立刻变成
    // 刺眼的低分；默认全对则会悄悄虚高。两种默认都会错，但只有这个方向会自曝。
    const blocks = initialBlocks(listeningConfig, 'upper');
    for (const block of blocks.values()) {
      expect(block.wrong, `${block.taskType} 的默认错题数`).toBe(block.total);
    }
  });

  it('只生成当前走向下的模块，不含另一边', () => {
    const upper = initialBlocks(listeningConfig, 'upper');
    expect([...upper.keys()].some((k) => k.startsWith('lower::'))).toBe(false);

    const lower = initialBlocks(listeningConfig, 'lower');
    expect([...lower.keys()].some((k) => k.startsWith('upper::'))).toBe(false);
  });

  it('跳过该模块没有的题型', () => {
    // 听力 Upper 没有通知，阅读 Lower 没有学术长文
    expect(initialBlocks(listeningConfig, 'upper').has(blockKey('upper', 'announcements'))).toBe(false);
    expect(initialBlocks(readingConfig, 'lower').has(blockKey('lower', 'academic_passages'))).toBe(false);
  });

  it('Router 那一边的题组总数等于 20', () => {
    const blocks = initialBlocks(readingConfig, 'upper');
    const routerTotal = [...blocks.values()]
      .filter((b) => b.module === 'router')
      .reduce((sum, b) => sum + b.total, 0);
    expect(routerTotal).toBe(20);
  });

  it('非自适应科目用 none 键，不带模块', () => {
    const blocks = initialBlocks(writingConfig, 'upper');
    const build = blocks.get(blockKey(null, 'build_a_sentence'));
    expect(build?.total).toBe(10);
    expect(build?.module).toBeNull();
  });
});

describe('题型可用性由题数表的键决定', () => {
  const t = (config: typeof listeningConfig, key: string) => config.taskTypes.find((x) => x.key === key)!;

  it('听力：通知在 Router/Lower 可用，Upper 不可用', () => {
    const announcements = t(listeningConfig, 'announcements');
    expect(isTaskTypeAvailable(announcements, 'router')).toBe(true);
    expect(isTaskTypeAvailable(announcements, 'lower')).toBe(true);
    expect(isTaskTypeAvailable(announcements, 'upper')).toBe(false);
  });

  it('阅读：学术长文在 Lower 不可用', () => {
    expect(isTaskTypeAvailable(t(readingConfig, 'academic_passages'), 'lower')).toBe(false);
    expect(isTaskTypeAvailable(t(readingConfig, 'academic_passages'), 'upper')).toBe(true);
  });

  it('itemCount 对不可用的组合返回 undefined，不是 0', () => {
    // 返回 0 会被误当成「有这个题型但 0 题」，可用性判断就废了
    expect(itemCount(t(listeningConfig, 'academic_talks'), 'lower')).toBeUndefined();
    expect(itemCount(t(listeningConfig, 'academic_talks'), 'upper')).toBe(8);
  });
});
