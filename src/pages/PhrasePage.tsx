import { useMemo, useState } from 'react';
import type { PhraseCategory } from '../types';
import { useAppData } from '../store/hooks';
import { EmptyState } from '../components/EmptyState';
import { cx } from '../utils/ui';

const CATEGORIES: { key: PhraseCategory; label: string; hint: string }[] = [
  { key: 'grammar', label: '语法点', hint: '对应写作的 Build a Sentence —— 那 10 道题考的就是语法结构。' },
  { key: 'transition', label: '连接词', hint: '转折、递进、举例、总结，听力抓信号词也靠它。' },
  { key: 'writing', label: '写作句型', hint: 'Email 的开头结尾、学术讨论里回应同学观点的说法。' },
  { key: 'speaking', label: '口语句型', hint: 'Take an Interview 45 秒没准备时间，得有现成的起手句。' },
];

export function PhrasePage() {
  const { data, addPhrase, removePhrase } = useAppData();
  const [active, setActive] = useState<PhraseCategory>('grammar');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ text: '', usage: '', example: '' });

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

  const handleAdd = () => {
    if (!draft.text.trim()) return;
    addPhrase({
      text: draft.text.trim(),
      category: active,
      usage: draft.usage.trim() || undefined,
      example: draft.example.trim() || undefined,
    });
    setDraft({ text: '', usage: '', example: '' });
  };

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

      <section className="card space-y-2">
        <textarea
          className="input resize-y"
          rows={2}
          placeholder={`新的${activeConfig.label}`}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            placeholder="用法说明（选填）"
            value={draft.usage}
            onChange={(e) => setDraft({ ...draft, usage: e.target.value })}
          />
          <input
            className="input"
            placeholder="例句（选填）"
            value={draft.example}
            onChange={(e) => setDraft({ ...draft, example: e.target.value })}
          />
        </div>
        <button type="button" className="btn-primary w-full" onClick={handleAdd} disabled={!draft.text.trim()}>
          + 加进{activeConfig.label}
        </button>
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
            <li key={phrase.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{phrase.text}</p>
                <button
                  type="button"
                  onClick={() => removePhrase(phrase.id)}
                  aria-label="删除这条"
                  className="shrink-0 text-xs text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
                >
                  ×
                </button>
              </div>
              {phrase.usage && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{phrase.usage}</p>}
              {phrase.example && (
                <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{phrase.example}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
