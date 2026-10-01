import { useState } from 'react';
import type { PhraseEntry } from '../../types';
import { cx } from '../../utils/ui';
import { PHRASE_CATEGORIES } from './PhraseForm';

interface Props {
  phrase: PhraseEntry;
  onSave: (patch: Partial<PhraseEntry>) => void;
  onRemove: () => void;
  /** 面板里的列表是混分类的，行上要标出分类；全局页面本来就按分类筛过了，不用。 */
  showCategory?: boolean;
  /** 面板里窄，编辑态的输入框堆叠而不是两列。 */
  compact?: boolean;
}

/**
 * 一条句型：显示 + 行内编辑（含改分类）。
 * 全局句型库页面和练习详情的面板共用这一份。
 */
export function PhraseCard({ phrase, onSave, onRemove, showCategory = false, compact = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(phrase);

  const categoryLabel = PHRASE_CATEGORIES.find((c) => c.key === phrase.category)?.label ?? phrase.category;

  const startEdit = () => {
    setDraft(phrase); // 从当前值开始，免得留着上次取消掉的改动
    setEditing(true);
  };

  const save = () => {
    if (!draft.text.trim()) return;
    onSave({
      text: draft.text.trim(),
      category: draft.category,
      usage: draft.usage?.trim() || undefined,
      example: draft.example?.trim() || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-slate-400 p-3 dark:border-slate-500">
        <div className="space-y-2">
          <textarea
            className="input resize-y"
            rows={2}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            aria-label="编辑句型"
            autoFocus
          />
          <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
            <input
              className="input"
              placeholder="用法说明（选填）"
              value={draft.usage ?? ''}
              onChange={(e) => setDraft({ ...draft, usage: e.target.value })}
              aria-label="编辑用法"
            />
            <input
              className="input"
              placeholder="例句（选填）"
              value={draft.example ?? ''}
              onChange={(e) => setDraft({ ...draft, example: e.target.value })}
              aria-label="编辑例句"
            />
          </div>
          <div>
            <span className="label">分类（改了会移到对应分组）</span>
            <div className="flex flex-wrap gap-1.5">
              {PHRASE_CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={draft.category === c.key}
                  onClick={() => setDraft({ ...draft, category: c.key })}
                  className={cx(
                    'chip border transition',
                    draft.category === c.key
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={save} disabled={!draft.text.trim()}>
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
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{phrase.text}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={startEdit}
            aria-label="编辑这条"
            className="text-xs text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="删除这条"
            className="text-xs text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
          >
            ×
          </button>
        </div>
      </div>
      {(showCategory || phrase.usage) && (
        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          {showCategory && <span className="text-slate-400 dark:text-slate-500">{categoryLabel}</span>}
          {phrase.usage && <span>{phrase.usage}</span>}
        </p>
      )}
      {phrase.example && (
        <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">{phrase.example}</p>
      )}
    </li>
  );
}
