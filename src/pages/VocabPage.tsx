import { useMemo, useState } from 'react';
import type { Familiarity, VocabEntry } from '../types';
import { useAppData } from '../store/hooks';
import { EmptyState } from '../components/EmptyState';
import { cx } from '../utils/ui';

const FAMILIARITY: { value: Familiarity; label: string; className: string }[] = [
  { value: 0, label: '生', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { value: 1, label: '眼熟', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { value: 2, label: '会用', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { value: 3, label: '掌握', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
];

export function VocabPage() {
  const { data, addVocab, updateVocab, removeVocab } = useAppData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Familiarity | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState({ word: '', meaning: '', example: '', source: '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.vocab
      .filter((v) => (filter === null || v.familiarity === filter))
      .filter((v) => !q || v.word.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q))
      .sort((a, b) => a.familiarity - b.familiarity || b.createdAt.localeCompare(a.createdAt));
  }, [data.vocab, query, filter]);

  const counts = useMemo(() => {
    const map = new Map<Familiarity, number>();
    for (const v of data.vocab) map.set(v.familiarity, (map.get(v.familiarity) ?? 0) + 1);
    return map;
  }, [data.vocab]);

  const handleAdd = () => {
    if (!draft.word.trim()) return;
    addVocab({
      word: draft.word.trim(),
      meaning: draft.meaning.trim(),
      example: draft.example.trim() || undefined,
      source: draft.source.trim() || undefined,
      familiarity: 0,
    });
    setDraft({ word: '', meaning: '', example: '', source: draft.source });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">生词本</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          新版阅读有词汇填空题，写作口语也吃词汇量。做题时碰到的生词都攒这儿。
        </p>
      </header>

      <section className="card space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            placeholder="单词"
            value={draft.word}
            onChange={(e) => setDraft({ ...draft, word: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            className="input"
            placeholder="释义"
            value={draft.meaning}
            onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            placeholder="例句（选填）"
            value={draft.example}
            onChange={(e) => setDraft({ ...draft, example: e.target.value })}
          />
          <input
            className="input"
            placeholder="来源，如 官方模考 2（选填）"
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
          />
        </div>
        <button type="button" className="btn-primary w-full" onClick={handleAdd} disabled={!draft.word.trim()}>
          + 加入生词本
        </button>
      </section>

      {data.vocab.length === 0 ? (
        <EmptyState title="生词本还是空的" hint="从阅读的词汇填空题错题开始攒起，一次记三五个就够。" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input min-w-40 flex-1"
              placeholder="搜索单词或释义"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={cx(quizMode ? 'btn-primary' : 'btn-ghost', 'shrink-0')}
              onClick={() => {
                setQuizMode(!quizMode);
                setRevealed(new Set());
              }}
            >
              {quizMode ? '退出抽查' : '抽查模式'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={cx(
                'chip border transition',
                filter === null
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400',
              )}
            >
              全部 {data.vocab.length}
            </button>
            {FAMILIARITY.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(filter === f.value ? null : f.value)}
                className={cx(
                  'chip border transition',
                  filter === f.value
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400',
                )}
              >
                {f.label} {counts.get(f.value) ?? 0}
              </button>
            ))}
          </div>

          {quizMode && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              释义已遮住，先自己想一遍再点开。答不上来的记得把熟练度调回「生」。
            </p>
          )}

          <ul className="space-y-2">
            {filtered.map((entry) => (
              <VocabCard
                key={entry.id}
                entry={entry}
                quizMode={quizMode}
                revealed={revealed.has(entry.id)}
                onReveal={() => setRevealed(new Set(revealed).add(entry.id))}
                onSetFamiliarity={(familiarity) => updateVocab(entry.id, { familiarity })}
                onRemove={() => removeVocab(entry.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function VocabCard({
  entry,
  quizMode,
  revealed,
  onReveal,
  onSetFamiliarity,
  onRemove,
}: {
  entry: VocabEntry;
  quizMode: boolean;
  revealed: boolean;
  onReveal: () => void;
  onSetFamiliarity: (f: Familiarity) => void;
  onRemove: () => void;
}) {
  const hidden = quizMode && !revealed;

  return (
    <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{entry.word}</p>
          {hidden ? (
            <button
              type="button"
              onClick={onReveal}
              className="mt-1 w-full rounded bg-slate-100 py-1.5 text-xs text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              点开看释义
            </button>
          ) : (
            <>
              {entry.meaning && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{entry.meaning}</p>}
              {entry.example && (
                <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{entry.example}</p>
              )}
            </>
          )}
          {entry.source && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">来自 {entry.source}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`删除 ${entry.word}`}
          className="shrink-0 text-xs text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex gap-1">
        {FAMILIARITY.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onSetFamiliarity(f.value)}
            aria-pressed={entry.familiarity === f.value}
            className={cx(
              'chip flex-1 justify-center transition',
              entry.familiarity === f.value
                ? f.className
                : 'bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </li>
  );
}
