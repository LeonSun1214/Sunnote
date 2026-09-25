import { describe, expect, it } from 'vitest';
import {
  applyImport,
  DATA_VERSION,
  emptyData,
  findSnapshot,
  loadData,
  migrate,
  removeSnapshot,
  SNAPSHOT_PREFIX,
} from './storage';
import type { AppData, Note } from '../types';
import { sessionAccuracy } from '../utils/stats';

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

/**
 * localStorage 的最小替身。vitest 跑在 node 环境下没有这个全局对象，
 * 但 storage.ts 里都是在函数内部引用它，所以测试前赋值就够，不用引 jsdom。
 */
function installLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const api = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: api, configurable: true, writable: true });
  return store;
}

describe('迁移前快照', () => {
  /**
   * 真正要防的事：AppDataContext 有 beforeunload 冲刷，用户打开再关掉页面，
   * 迁移后的数据就覆盖了原始数据。快照是唯一的退路。
   */
  const v1Raw = JSON.stringify({
    version: 1,
    sessions: [
      { id: 's1', subject: 'listening', setName: '官方模考 2', date: '2026-08-27', blocks: [], tasks: [] },
      { id: 's2', subject: 'reading', setName: '官方模考 3', date: '2026-08-28', blocks: [], tasks: [] },
    ],
    notes: [{ id: 'n1', subject: 'writing', title: '连接词', body: '', tags: [] }],
    vocab: [{ id: 'v1', word: 'mitigate', meaning: '减轻', familiarity: 0 }],
    phrases: [],
    settings: { theme: 'dark' },
  });

  it('v1 数据加载后留下逐字节相同的快照', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', v1Raw);

    const loaded = loadData();
    expect(loaded.sessions.map((s) => s.subject)).toEqual(['toefl-listening', 'toefl-reading']);

    const snapshot = findSnapshot();
    expect(snapshot?.key).toBe(`${SNAPSHOT_PREFIX}1`);
    // 逐字节相同 —— 快照的意义就是「原件」，被处理过就不是原件了
    expect(snapshot?.raw).toBe(v1Raw);
  });

  it('后续加载不会覆盖掉最早那份快照', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', v1Raw);
    loadData();
    expect(findSnapshot()?.raw).toBe(v1Raw);

    // 之后主数据又被写坏了，但版本号还停在 v1，所以还会再次触发快照。
    // 这时候绝不能覆盖 —— 第一份才是完好的，后写的这份已经缺了记录。
    const damaged = JSON.stringify({ ...JSON.parse(v1Raw), sessions: [], notes: [] });
    store.set('sunnote:data', damaged);
    loadData();

    expect(findSnapshot()?.raw).toBe(v1Raw);
  });

  it('已经写回 v2 之后再加载，不会拿迁移后的数据盖掉快照', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', v1Raw);
    loadData();

    // 模拟 beforeunload 把 v2 写了回去，然后用户再打开一次
    store.set('sunnote:data', JSON.stringify(migrate(JSON.parse(v1Raw))));
    loadData();

    expect(findSnapshot()?.raw).toBe(v1Raw);
  });

  it('同时存在多份快照时，返回版本号最小的那份', () => {
    const store = installLocalStorage();
    store.set(`${SNAPSHOT_PREFIX}2-salvage`, '{"version":2,"sessions":[]}');
    store.set(`${SNAPSHOT_PREFIX}1`, v1Raw);
    // 插入顺序是 v2 在前，但该返回 v1 —— 越早的越接近原件
    expect(findSnapshot()?.key).toBe(`${SNAPSHOT_PREFIX}1`);
  });

  it('已经是当前版本的数据不产生快照', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', JSON.stringify({ ...emptyData(), sessions: [] }));
    loadData();
    expect(findSnapshot()).toBeNull();
  });

  it('sessions 不是数组时被静默清空 —— 这种也要留快照', () => {
    const store = installLocalStorage();
    // migrate 里 `Array.isArray(x) ? x : []` 会把它换成空数组且不报错。
    // 界面只会显示「还没录过」，然后 beforeunload 把空状态写回去。
    const malformed = JSON.stringify({
      version: DATA_VERSION,
      sessions: { '0': { id: 's1', subject: 'toefl-listening', setName: '官方模考 2' } },
      notes: [],
      vocab: [],
      phrases: [],
      settings: { theme: 'system', lastExportedAt: '2026-09-01T00:00:00.000Z' },
    });
    store.set('sunnote:data', malformed);

    const loaded = loadData();
    expect(loaded.sessions).toEqual([]); // 确认确实被清空了

    const snapshot = findSnapshot();
    expect(snapshot?.key).toBe(`${SNAPSHOT_PREFIX}${DATA_VERSION}-salvage`);
    expect(snapshot?.raw).toBe(malformed);
  });

  it('本来就是空数据时不留 salvage 快照，不然每个新用户都背一份空备份', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', JSON.stringify({ version: 1, sessions: [], notes: [], vocab: [], phrases: [] }));
    loadData();
    expect(findSnapshot()?.key).toBe(`${SNAPSHOT_PREFIX}1`); // 版本旧仍然留（走的是条件 1）

    const store2 = installLocalStorage();
    store2.set('sunnote:data', JSON.stringify({ version: DATA_VERSION, sessions: [], notes: [], vocab: [], phrases: [] }));
    loadData();
    expect(findSnapshot()).toBeNull(); // 版本对得上、原始数据本来就没记录 → 不留
  });

  it('快照能原样喂回 applyImport 还原数据', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', v1Raw);
    loadData();

    const snapshot = findSnapshot()!;
    const restored = applyImport(emptyData(), JSON.parse(snapshot.raw), 'replace');
    expect(restored.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(restored.notes[0].title).toBe('连接词');
    expect(restored.vocab[0].word).toBe('mitigate');
    expect(restored.settings.theme).toBe('dark');
  });

  it('removeSnapshot 删掉之后 findSnapshot 就找不到了', () => {
    const store = installLocalStorage();
    store.set('sunnote:data', v1Raw);
    loadData();
    removeSnapshot(findSnapshot()!.key);
    expect(findSnapshot()).toBeNull();
  });
});

describe('练习记录里的数组字段归一化', () => {
  // stats 那边直接 .filter() / .reduce()，不是数组就抛。这里没有第二道防线，
  // 抛了就是白屏，用户连导出按钮都够不到 —— 所以在数据入口就修掉。
  it('blocks / tasks 不是数组时换成空数组，而不是让统计崩掉', () => {
    const out = migrate({
      version: DATA_VERSION,
      sessions: [
        { id: 's1', subject: 'toefl-listening', setName: 'A', date: '2026-01-01', blocks: null, tasks: undefined },
        { id: 's2', subject: 'toefl-reading', setName: 'B', date: '2026-01-02', blocks: 'oops', tasks: {} },
      ],
    });
    for (const session of out.sessions) {
      expect(Array.isArray(session.blocks)).toBe(true);
      expect(Array.isArray(session.tasks)).toBe(true);
    }
    // 并且真的能喂给统计而不抛
    expect(() => out.sessions.map(sessionAccuracy)).not.toThrow();
    expect(out.sessions.map(sessionAccuracy)).toEqual([null, null]);
  });

  it('正常的 blocks / tasks 原样保留', () => {
    const blocks = [{ module: 'router', taskType: 'vocabulary', total: 10, wrong: 3 }];
    const out = migrate({
      version: DATA_VERSION,
      sessions: [{ id: 's1', subject: 'toefl-reading', setName: 'A', date: '2026-01-01', blocks, tasks: [] }],
    });
    expect(out.sessions[0].blocks).toEqual(blocks);
    expect(sessionAccuracy(out.sessions[0])).toBeCloseTo(0.7);
  });
});

describe('settings.plans 在入口归一化', () => {
  it('不合法的计划不会进状态，合法的原样保留，其它设置不受影响', () => {
    const out = migrate({
      version: DATA_VERSION,
      settings: {
        theme: 'dark',
        plans: { toefl: { date: '2026-10-18', target: 105 }, ielts: { date: 'nope', target: 12 } },
      },
    });
    expect(out.settings.theme).toBe('dark');
    expect(out.settings.plans).toEqual({ toefl: { date: '2026-10-18', target: 105 }, ielts: { target: 9 } });
  });

  it('没有计划时 settings 里就没有 plans 这个键，和空数据一致', () => {
    expect(migrate({ settings: { plans: 'junk' } })).toEqual(emptyData());
    expect(migrate({ settings: { plans: { toefl: {} } } }).settings).not.toHaveProperty('plans');
  });

  it('导入合并时以备份里的计划为准，和其它设置字段一个规则', () => {
    const current: AppData = { ...emptyData(), settings: { theme: 'system', plans: { toefl: { target: 100 } } } };
    const incoming = { ...emptyData(), settings: { theme: 'system', plans: { ielts: { date: '2026-10-18' } } } };
    expect(applyImport(current, incoming, 'merge').settings.plans).toEqual({ ielts: { date: '2026-10-18' } });
    // 备份里根本没有 plans 时，本地的留着
    expect(applyImport(current, emptyData(), 'merge').settings.plans).toEqual({ toefl: { target: 100 } });
  });
});
