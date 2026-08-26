import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Note, Subject } from '../../types';
import { taskTypeLabel } from '../../config/subjects';
import { relativeTime } from '../../utils/date';
import { EmptyState } from '../EmptyState';
import { cx } from '../../utils/ui';

interface Props {
  subject: Subject;
  notes: Note[];
}

export function NoteList({ subject, notes }: Props) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (activeTag && !note.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.body.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [notes, query, activeTag]);

  if (notes.length === 0) {
    return (
      <EmptyState
        title="还没有错题笔记"
        hint="把错题背后的知识点写下来 —— 为什么错、正确思路是什么、下次怎么避开。比单纯记错题数有用得多。"
        action={
          <Link to={`/${subject}/note/new`} className="btn-primary">
            写第一条笔记
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-40"
          placeholder="搜索标题、正文、标签"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Link to={`/${subject}/note/new`} className="btn-primary shrink-0">
          + 新笔记
        </Link>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cx(
                'chip border transition',
                activeTag === tag
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
              )}
            >
              {tag}
              <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="没有匹配的笔记" hint="换个关键词，或取消标签筛选。" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((note) => (
            <li key={note.id}>
              <Link
                to={`/${subject}/note/${note.id}`}
                className="block rounded-lg border border-slate-200 p-3 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{note.title || '（无标题）'}</p>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{relativeTime(note.updatedAt)}</span>
                </div>
                {note.body && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{note.body}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {note.taskType && (
                    <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {taskTypeLabel(subject, note.taskType)}
                    </span>
                  )}
                  {note.tags.map((tag) => (
                    <span key={tag} className="chip bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
