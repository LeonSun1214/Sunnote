import type { AppData, Session } from '../types';

const STORAGE_KEY = 'sunnote:data';

/** 给错误边界用：崩溃时要绕开应用状态直接读这个 key。 */
export const RAW_STORAGE_KEY = STORAGE_KEY;

/** 数据结构版本。改动 AppData 形状时 +1，并在 migrate 里补上迁移。 */
export const DATA_VERSION = 2;

/**
 * v1 → v2：加入雅思后，subject 从四科（'listening'）变成「考试-技能」
 * 复合键（'toefl-listening'）。老数据全是托福，统一加前缀。
 *
 * 必须幂等 —— migrate 在每次读取和每次导入时都会跑，把已经迁移过的值
 * 再加一次前缀会变成 'toefl-toefl-listening'，那条记录就永远查不到配置了。
 */
const LEGACY_SKILLS = ['listening', 'reading', 'writing', 'speaking'];

function upgradeSubject(value: unknown): string {
  if (typeof value !== 'string') return 'toefl-listening';
  return LEGACY_SKILLS.includes(value) ? `toefl-${value}` : value;
}

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    sessions: [],
    notes: [],
    vocab: [],
    phrases: [],
    settings: { theme: 'system' },
  };
}

/**
 * 把任意来源的数据（localStorage 或导入的 JSON）normalize 成当前版本。
 * 缺字段一律补默认值 —— 宁可少一条字段也不要整个应用打不开。
 */
export function migrate(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') return base;

  const data = raw as Partial<AppData>;
  // subject 带考试前缀。只有 sessions 和 notes 有这个字段，生词和句型是跨科目的。
  const withSubject = <T extends { subject?: unknown }>(items: unknown): T[] =>
    Array.isArray(items)
      ? items.map((item) => ({ ...item, subject: upgradeSubject(item?.subject) }) as T)
      : [];

  /**
   * 练习记录里的 blocks / tasks 必须是数组 —— 统计那边直接 .filter() 和
   * .reduce()，不是数组就会抛，而这里没有错误边界之外的第二道防线，
   * 抛了就是白屏，用户连导出按钮都够不到。
   *
   * 归一化放在这里而不是散落到 stats 里：migrate 是不可信数据进入系统的
   * 边界，在边界上修一次比在每个消费点各防一次可靠。坏掉的那条记录会变成
   * 空数组（界面上看得见、能改），原件则留在迁移前快照里。
   */
  const withArrays = (items: unknown): Session[] =>
    withSubject<Session>(items).map((session) => ({
      ...session,
      blocks: Array.isArray(session.blocks) ? session.blocks : [],
      tasks: Array.isArray(session.tasks) ? session.tasks : [],
    }));

  return {
    version: DATA_VERSION,
    sessions: withArrays(data.sessions),
    notes: withSubject(data.notes),
    vocab: Array.isArray(data.vocab) ? data.vocab : [],
    phrases: Array.isArray(data.phrases) ? data.phrases : [],
    settings: { ...base.settings, ...(data.settings ?? {}) },
  };
}

/** 迁移前快照的 key 前缀，后面接源数据的版本号。 */
export const SNAPSHOT_PREFIX = `${STORAGE_KEY}:before-v`;

function isEmptyData(data: AppData): boolean {
  return (
    data.sessions.length === 0 &&
    data.notes.length === 0 &&
    data.vocab.length === 0 &&
    data.phrases.length === 0
  );
}

/**
 * 原始数据里**看起来**有多少条记录 —— 不假设它是数组。
 * 用来和迁移结果对账：原始有、迁移后没有，就说明被丢了。
 */
function rawRecordCount(parsed: unknown): number {
  if (!parsed || typeof parsed !== 'object') return 0;
  const obj = parsed as Record<string, unknown>;
  let count = 0;
  for (const key of ['sessions', 'notes', 'vocab', 'phrases']) {
    const value = obj[key];
    if (Array.isArray(value)) count += value.length;
    else if (typeof value === 'string') count += value.length > 0 ? 1 : 0;
    else if (value && typeof value === 'object') count += Object.keys(value).length;
  }
  return count;
}

/**
 * 迁移前把原始串原封不动存一份。
 *
 * 为什么必须有：AppDataContext 注册了 beforeunload 冲刷，所以用户哪怕只是
 * 打开再关掉页面，迁移后的数据就会覆盖掉同一个 key —— 原始数据没有退路。
 * 快照是那个退路。
 *
 * key 里带源版本号，所以同一次升级只写一次，之后每次加载都不会覆盖掉最早
 * 那份（真出问题时，最早那份才是完好的）。
 *
 * 两个触发条件：
 * 1. 版本号对不上 —— 正常的升级路径
 * 2. 原始数据里有记录、迁移完却一条不剩 —— migrate() 里 `Array.isArray(x) ? x : []`
 *    这条分支会把畸形数据静默换成空数组，界面显示「还没录过」且不报错。
 *    这是唯一真正会丢数据的机制，概率低但不可逆，所以单独兜一层。
 */
function snapshotBeforeMigrate(raw: string, parsed: unknown, migrated: AppData): void {
  try {
    const version = (parsed as { version?: unknown } | null)?.version;
    const versionTag = typeof version === 'number' ? String(version) : 'unknown';

    const outdated = version !== DATA_VERSION;
    const silentlyEmptied = isEmptyData(migrated) && rawRecordCount(parsed) > 0;
    if (!outdated && !silentlyEmptied) return;

    const key = silentlyEmptied ? `${SNAPSHOT_PREFIX}${versionTag}-salvage` : `${SNAPSHOT_PREFIX}${versionTag}`;
    // 已经有了就不动 —— 第一份才是完好的
    if (localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, raw);
  } catch {
    /* 配额满或存储不可用时跳过。快照是保险，不能反过来挡住应用启动 */
  }
}

/**
 * 找出当前存着的迁移前快照。没有就返回 null。
 *
 * 可能同时存在多份（比如先升级留了 before-v1，后来又触发了 salvage）。
 * 统一返回**版本号最小**那份 —— 越早的越接近原件。localStorage 的 key()
 * 顺序没有标准保证，所以这里显式排序，不依赖遍历顺序。
 */
export function findSnapshot(): { key: string; raw: string } | null {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(SNAPSHOT_PREFIX)) keys.push(key);
    }
    keys.sort((a, b) => {
      const num = (k: string) => {
        const parsed = Number.parseInt(k.slice(SNAPSHOT_PREFIX.length), 10);
        return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
      };
      return num(a) - num(b) || a.localeCompare(b);
    });
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) return { key, raw };
    }
  } catch {
    /* 读不到就当没有 */
  }
  return null;
}

export function removeSnapshot(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 删不掉也不影响使用 */
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);
    snapshotBeforeMigrate(raw, parsed, migrated);
    return migrated;
  } catch (error) {
    // 数据损坏时不要白屏。保留原始串到另一个 key，方便手动抢救。
    console.error('读取本地数据失败，已重置为空数据', error);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(`${STORAGE_KEY}:corrupted:${Date.now()}`, raw);
    } catch {
      /* 抢救失败就算了，不能因此挡住应用启动 */
    }
    return emptyData();
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('写入本地数据失败', error);
    throw error;
  }
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** 导入时的合并策略。 */
export type ImportMode = 'replace' | 'merge';

/** 按 id 去重合并；同 id 保留 updatedAt 更新的那条。 */
function mergeById<T extends { id: string; updatedAt?: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      continue;
    }
    const a = existing.updatedAt ?? '';
    const b = item.updatedAt ?? '';
    map.set(item.id, b >= a ? item : existing);
  }
  return [...map.values()];
}

export function applyImport(current: AppData, incomingRaw: unknown, mode: ImportMode): AppData {
  const incoming = migrate(incomingRaw);
  if (mode === 'replace') return incoming;

  return {
    version: DATA_VERSION,
    sessions: mergeById(current.sessions, incoming.sessions),
    notes: mergeById(current.notes, incoming.notes),
    vocab: mergeById(current.vocab, incoming.vocab),
    phrases: mergeById(current.phrases, incoming.phrases),
    settings: { ...current.settings, ...incoming.settings },
  };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
