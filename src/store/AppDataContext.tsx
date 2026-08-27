import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppData, AppSettings, Note, PhraseEntry, Session, VocabEntry } from '../types';
import { applyImport, clearData, emptyData, loadData, newId, nowIso, saveData } from './storage';
import type { ImportMode } from './storage';

type WithTimestamps = { id: string; createdAt: string; updatedAt: string };
type Draft<T extends WithTimestamps> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

export interface AppDataApi {
  data: AppData;

  addSession: (draft: Draft<Session>) => Session;
  updateSession: (id: string, patch: Partial<Session>) => void;
  removeSession: (id: string) => void;

  addNote: (draft: Draft<Note>) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  removeNote: (id: string) => void;

  addVocab: (draft: Draft<VocabEntry>) => VocabEntry;
  updateVocab: (id: string, patch: Partial<VocabEntry>) => void;
  removeVocab: (id: string) => void;

  addPhrase: (draft: Draft<PhraseEntry>) => PhraseEntry;
  updatePhrase: (id: string, patch: Partial<PhraseEntry>) => void;
  removePhrase: (id: string) => void;

  updateSettings: (patch: Partial<AppSettings>) => void;
  importData: (raw: unknown, mode: ImportMode) => void;
  resetData: () => void;
}

export const AppDataContext = createContext<AppDataApi | null>(null);

/** 写入防抖：连续编辑时不必每次按键都刷 localStorage。 */
const SAVE_DEBOUNCE_MS = 300;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const timer = useRef<number | undefined>(undefined);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      // 初始状态就是从 localStorage 读来的，没必要原样写回去
      firstRender.current = false;
      return;
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveData(data), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer.current);
  }, [data]);

  // 关页面前把还没落盘的改动补上，避免丢掉最后几秒的输入
  useEffect(() => {
    const flush = () => {
      window.clearTimeout(timer.current);
      saveData(data);
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [data]);

  function makeCrud<K extends 'sessions' | 'notes' | 'vocab' | 'phrases', T extends WithTimestamps>(key: K) {
    const add = (draft: Draft<T>): T => {
      const stamp = nowIso();
      const entity = { ...draft, id: newId(), createdAt: stamp, updatedAt: stamp } as unknown as T;
      setData((prev) => ({ ...prev, [key]: [...(prev[key] as unknown as T[]), entity] }));
      return entity;
    };
    const update = (id: string, patch: Partial<T>) => {
      setData((prev) => ({
        ...prev,
        [key]: (prev[key] as unknown as T[]).map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
        ),
      }));
    };
    const remove = (id: string) => {
      setData((prev) => ({
        ...prev,
        [key]: (prev[key] as unknown as T[]).filter((item) => item.id !== id),
      }));
    };
    return { add, update, remove };
  }

  const sessionCrud = useMemo(() => makeCrud<'sessions', Session>('sessions'), []);
  const noteCrud = useMemo(() => makeCrud<'notes', Note>('notes'), []);
  const vocabCrud = useMemo(() => makeCrud<'vocab', VocabEntry>('vocab'), []);
  const phraseCrud = useMemo(() => makeCrud<'phrases', PhraseEntry>('phrases'), []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const importData = useCallback((raw: unknown, mode: ImportMode) => {
    setData((prev) => applyImport(prev, raw, mode));
  }, []);

  const resetData = useCallback(() => {
    clearData();
    setData(emptyData());
  }, []);

  const api = useMemo<AppDataApi>(
    () => ({
      data,
      addSession: sessionCrud.add,
      updateSession: sessionCrud.update,
      removeSession: sessionCrud.remove,
      addNote: noteCrud.add,
      updateNote: noteCrud.update,
      removeNote: noteCrud.remove,
      addVocab: vocabCrud.add,
      updateVocab: vocabCrud.update,
      removeVocab: vocabCrud.remove,
      addPhrase: phraseCrud.add,
      updatePhrase: phraseCrud.update,
      removePhrase: phraseCrud.remove,
      updateSettings,
      importData,
      resetData,
    }),
    [data, sessionCrud, noteCrud, vocabCrud, phraseCrud, updateSettings, importData, resetData],
  );

  return <AppDataContext.Provider value={api}>{children}</AppDataContext.Provider>;
}
