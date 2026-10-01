import { useState } from 'react';
import type { Familiarity, VocabEntry } from '../../types';
import { cx } from '../../utils/ui';

/** 熟练度四档。生词本页面的筛选 chips 和卡片上的档位按钮都从这儿取。 */
export const FAMILIARITY: { value: Familiarity; label: string; className: string }[] = [
  { value: 0, label: '生', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { value: 1, label: '眼熟', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { value: 2, label: '会用', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  { value: 3, label: '掌握', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
];

interface Props {
  entry: VocabEntry;
  onSave: (patch: Partial<VocabEntry>) => void;
  onRemove: () => void;
  onSetFamiliarity: (f: Familiarity) => void;
  /** 抽查模式：遮住释义，点开才看。只有全局生词本用；面板不传，释义永远可见。 */
  quizMode?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  /** 面板里来源永远是这套题：行上不显示「来自 xx」，编辑态也不给改。 */
  showSource?: boolean;
  /** 面板里窄，编辑态的输入框堆叠而不是两列。 */
  compact?: boolean;
}

/**
 * 一条生词：显示 + 行内编辑 + 熟练度四档。
 * 全局生词本页面和练习详情的面板共用这一份 —— 面板里原来是一版只有删除的裸行，
 * 用户录完想改释义改不了。
 */
export function VocabCard({
  entry,
  onSave,
  onRemove,
  onSetFamiliarity,
  quizMode = false,
  revealed = true,
  onReveal,
  showSource = true,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry);

  const hidden = quizMode && !revealed && !editing;

  const startEdit = () => {
    setDraft(entry); // 每次进编辑都从当前值开始，免得留着上次取消掉的改动
    setEditing(true);
  };

  const save = () => {
    if (!draft.word.trim()) return;
    const patch: Partial<VocabEntry> = {
      word: draft.word.trim(),
      meaning: draft.meaning.trim(),
      example: draft.example?.trim() || undefined,
    };
    // 不显示来源时也不动它 —— updateVocab 是浅合并，不传这个字段就保持原值
    if (showSource) patch.source = draft.source?.trim() || undefined;
    onSave(patch);
    setEditing(false);
  };

  const twoCols = compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2';

  if (editing) {
    return (
      <li className="rounded-lg border border-slate-400 p-3 dark:border-slate-500">
        <div className="space-y-2">
          <div className={twoCols}>
            <input
              className="input"
              placeholder="单词"
              value={draft.word}
              onChange={(e) => setDraft({ ...draft, word: e.target.value })}
              aria-label="编辑单词"
              autoFocus
            />
            <input
              className="input"
              placeholder="释义"
              value={draft.meaning}
              onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
              aria-label="编辑释义"
            />
          </div>
          <div className={showSource ? twoCols : 'space-y-2'}>
            <input
              className="input"
              placeholder="例句（选填）"
              value={draft.example ?? ''}
              onChange={(e) => setDraft({ ...draft, example: e.target.value })}
              aria-label="编辑例句"
            />
            {showSource && (
              <input
                className="input"
                placeholder="来源（选填）"
                value={draft.source ?? ''}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                aria-label="编辑来源"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={save} disabled={!draft.word.trim()}>
              保存
            </button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              取消
            </button>
          </div>
        </div>
      </li>
    );
  }

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
          {showSource && entry.source && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">来自 {entry.source}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={startEdit}
            aria-label={`编辑 ${entry.word}`}
            className="text-xs text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`删除 ${entry.word}`}
            className="text-xs text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
          >
            ×
          </button>
        </div>
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
