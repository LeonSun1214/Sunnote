import { useMemo, useState } from 'react';
import type { Familiarity } from '../types';
import { useAppData } from '../store/hooks';
import { EmptyState } from '../components/EmptyState';
import { VocabForm } from '../components/vocab/VocabForm';
import { FAMILIARITY, VocabCard } from '../components/vocab/VocabCard';
import { cx } from '../utils/ui';

export function VocabPage() {
  const { data, addVocab, updateVocab, removeVocab } = useAppData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Familiarity | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">生词本</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          新版阅读有词汇填空题，写作口语也吃词汇量。做题时碰到的生词都攒这儿。
        </p>
      </header>

      <section className="card">
        <VocabForm onAdd={(draft) => addVocab({ ...draft, familiarity: 0 })} />
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
                onSave={(patch) => updateVocab(entry.id, patch)}
                onRemove={() => removeVocab(entry.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
