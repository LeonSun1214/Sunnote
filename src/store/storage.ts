import type { AppData } from '../types';

const STORAGE_KEY = 'sunnote:data';

/** 数据结构版本。改动 AppData 形状时 +1，并在 migrate 里补上迁移。 */
export const DATA_VERSION = 1;

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
  return {
    version: DATA_VERSION,
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    vocab: Array.isArray(data.vocab) ? data.vocab : [],
    phrases: Array.isArray(data.phrases) ? data.phrases : [],
    settings: { ...base.settings, ...(data.settings ?? {}) },
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return migrate(JSON.parse(raw));
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
