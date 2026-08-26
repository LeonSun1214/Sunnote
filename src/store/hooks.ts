import { useContext, useMemo } from 'react';
import { AppDataContext } from './AppDataContext';
import type { AppDataApi } from './AppDataContext';
import type { Subject } from '../types';
import { sessionsBySubject } from '../utils/stats';

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData 必须在 AppDataProvider 内使用');
  return ctx;
}

/** 某一科的练习记录，按日期倒序。 */
export function useSubjectSessions(subject: Subject) {
  const { data } = useAppData();
  return useMemo(() => sessionsBySubject(data.sessions, subject), [data.sessions, subject]);
}

/** 某一科的错题笔记，最近更新的排前面。 */
export function useSubjectNotes(subject: Subject) {
  const { data } = useAppData();
  return useMemo(
    () =>
      data.notes
        .filter((n) => n.subject === subject)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes, subject],
  );
}
