import { describe, expect, it } from 'vitest';
import { applyImport, DATA_VERSION, emptyData, migrate } from './storage';
import type { AppData, Note } from '../types';

function note(partial: Partial<Note>): Note {
  return {
    id: 'n1',
    subject: 'toefl-listening',
    title: '旧标题',
    body: '',
    tags: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...partial,
  };
}

describe('migrate', () => {
  it('垃圾输入回退成空数据而不是抛错', () => {
    expect(migrate(null)).toEqual(emptyData());
    expect(migrate('nonsense')).toEqual(emptyData());
    expect(migrate(42)).toEqual(emptyData());
  });

  it('缺字段补默认值', () => {
    const result = migrate({ sessions: [{ id: 'x' }] });
    expect(result.version).toBe(DATA_VERSION);
    expect(result.sessions).toHaveLength(1);
    expect(result.notes).toEqual([]);
    expect(result.settings.theme).toBe('system');
  });

  it('数组字段类型不对时不会污染状态', () => {
    const result = migrate({ notes: 'not-an-array' });
    expect(result.notes).toEqual([]);
  });
});

describe('applyImport', () => {
  const current: AppData = { ...emptyData(), notes: [note({ id: 'n1', title: '本地版' })] };

  it('replace 直接覆盖', () => {
    const result = applyImport(current, { ...emptyData(), notes: [note({ id: 'n2', title: '导入版' })] }, 'replace');
    expect(result.notes.map((n) => n.id)).toEqual(['n2']);
  });

  it('merge 按 id 去重', () => {
    const result = applyImport(current, { ...emptyData(), notes: [note({ id: 'n2' })] }, 'merge');
    expect(result.notes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('merge 遇到同 id 时保留 updatedAt 更新的那条', () => {
    const incoming = note({ id: 'n1', title: '更新版', updatedAt: '2026-08-20T00:00:00.000Z' });
    const result = applyImport(current, { ...emptyData(), notes: [incoming] }, 'merge');
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].title).toBe('更新版');
  });

  it('merge 时导入的旧数据不会覆盖本地新数据', () => {
    const localNew: AppData = { ...emptyData(), notes: [note({ id: 'n1', title: '本地新', updatedAt: '2026-08-25T00:00:00.000Z' })] };
    const incomingOld = note({ id: 'n1', title: '导入旧', updatedAt: '2026-08-02T00:00:00.000Z' });
    const result = applyImport(localNew, { ...emptyData(), notes: [incomingOld] }, 'merge');
    expect(result.notes[0].title).toBe('本地新');
  });
});

describe('v1 → v2 迁移：subject 加考试前缀', () => {
  /** 模拟一份旧版导出的备份：subject 还是四科，没有考试前缀。 */
  const v1Backup = {
    version: 1,
    sessions: [
      { id: 's1', subject: 'listening', setName: '官方模考 2', date: '2026-08-27', blocks: [], tasks: [] },
      { id: 's2', subject: 'writing', setName: '写作练习 1', date: '2026-08-27', blocks: [], tasks: [] },
    ],
    notes: [{ id: 'n1', subject: 'reading', title: '同义改写', body: '', tags: [] }],
    vocab: [{ id: 'v1', word: 'mitigate', meaning: '减轻', familiarity: 0 }],
    phrases: [{ id: 'p1', text: 'not only ... but also', category: 'grammar' }],
    settings: { theme: 'system' },
  };

  it('老数据的四科都加上 toefl- 前缀', () => {
    const out = migrate(v1Backup);
    expect(out.sessions.map((s) => s.subject)).toEqual(['toefl-listening', 'toefl-writing']);
    expect(out.notes[0].subject).toBe('toefl-reading');
    expect(out.version).toBe(DATA_VERSION);
  });

  it('迁移是幂等的 —— 跑两遍不会变成 toefl-toefl-listening', () => {
    // migrate 在每次读取和每次导入时都会跑，不幂等的话记录会永远查不到配置
    const once = migrate(v1Backup);
    const twice = migrate(once);
    expect(twice.sessions.map((s) => s.subject)).toEqual(['toefl-listening', 'toefl-writing']);
    expect(twice.notes[0].subject).toBe('toefl-reading');
  });

  it('已经是雅思的记录不会被改成托福', () => {
    const mixed = {
      ...v1Backup,
      sessions: [{ id: 's3', subject: 'ielts-listening', setName: '剑 18 Test 1', date: '2026-09-21', blocks: [], tasks: [] }],
    };
    expect(migrate(mixed).sessions[0].subject).toBe('ielts-listening');
  });

  it('生词和句型不带 subject，迁移不该给它们加上', () => {
    const out = migrate(v1Backup);
    expect(out.vocab[0]).not.toHaveProperty('subject');
    expect(out.phrases[0]).not.toHaveProperty('subject');
  });

  it('subject 缺失或不是字符串时兜底，不让整条记录作废', () => {
    const broken = { ...v1Backup, sessions: [{ id: 'x' }, { id: 'y', subject: 42 }] };
    const out = migrate(broken);
    expect(out.sessions.map((s) => s.subject)).toEqual(['toefl-listening', 'toefl-listening']);
  });

  it('迁移后其余字段原样保留', () => {
    const out = migrate(v1Backup);
    expect(out.sessions[0].setName).toBe('官方模考 2');
    expect(out.vocab[0].word).toBe('mitigate');
    expect(out.phrases[0].category).toBe('grammar');
  });
});
