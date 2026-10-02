import { useMemo, useState } from 'react';
import type { PhraseCategory } from '../types';
import { useAppData } from '../store/hooks';
import { EmptyState } from '../components/EmptyState';
import { cx } from '../utils/ui';
import { PHRASE_CATEGORIES as CATEGORIES, PhraseForm } from '../components/phrases/PhraseForm';
import { PhraseCard } from '../components/phrases/PhraseCard';


export function PhrasePage() {
  const { data, addPhrase, updatePhrase, removePhrase } = useAppData();
  const [active, setActive] = useState<PhraseCategory>('grammar');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const map = new Map<PhraseCategory, number>();
    for (const p of data.phrases) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [data.phrases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.phrases
      .filter((p) => p.category === active)
      .filter((p) => !q || p.text.toLowerCase().includes(q) || (p.usage ?? '').toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.phrases, active, query]);

  const activeConfig = CATEGORIES.find((c) => c.key === active)!;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">句型 / 表达库</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          攒好用的句型和结构。考场上没时间现想，靠的是这里攒下来的存货。
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setActive(c.key)}
            className={cx(
              'chip border transition',
              active === c.key
                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
            )}
          >
            {c.label}
            <span className="opacity-60">{counts.get(c.key) ?? 0}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{activeConfig.hint}</p>

      <section className="card">
        <PhraseForm category={active} onAdd={addPhrase} />
      </section>

      {data.phrases.length > 0 && (
        <input
          className="input"
          placeholder="搜索句型或用法"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={`还没有${activeConfig.label}`}
          hint={activeConfig.hint}
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((phrase) => (
            <PhraseCard
              key={phrase.id}
              phrase={phrase}
              onSave={(patch) => updatePhrase(phrase.id, patch)}
              onRemove={() => removePhrase(phrase.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
