import { describe, expect, it } from 'vitest';
import { applyImport, DATA_VERSION, emptyData, migrate } from './storage';
import type { AppData, Note } from '../types';

function note(partial: Partial<Note>): Note {
  return {
    id: 'n1',
    subject: 'listening',
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
