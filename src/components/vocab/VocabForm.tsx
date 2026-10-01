import { useState } from 'react';

export interface VocabDraft {
  word: string;
  meaning: string;
  example?: string;
  source?: string;
}

interface Props {
  onAdd: (draft: VocabDraft) => void;
  /**
   * 面板里从练习详情录入时来源是自动填的，不显示这个输入框。
   * 全局生词本页面才需要手填。
   */
  showSource?: boolean;
  /** 面板里的小标题和按钮文案都收紧一点。 */
  compact?: boolean;
}

/**
 * 生词录入表单。全局生词本页面和练习详情的面板共用。
 * 来源字段在连续录入之间保留 —— 一套题里碰到的几个生词通常来源相同，不用反复填。
 */
export function VocabForm({ onAdd, showSource = true, compact = false }: Props) {
  const [draft, setDraft] = useState({ word: '', meaning: '', example: '', source: '' });

  const handleAdd = () => {
    if (!draft.word.trim()) return;
    onAdd({
      word: draft.word.trim(),
      meaning: draft.meaning.trim(),
      example: draft.example.trim() || undefined,
      source: showSource ? draft.source.trim() || undefined : undefined,
    });
    setDraft({ word: '', meaning: '', example: '', source: draft.source });
  };

  return (
    <div className="space-y-2">
      <div className={compact ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
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
      <div className={compact || !showSource ? 'space-y-2' : 'grid gap-2 sm:grid-cols-2'}>
        <input
          className="input"
          placeholder="例句（选填）"
          value={draft.example}
          onChange={(e) => setDraft({ ...draft, example: e.target.value })}
        />
        {showSource && (
          <input
            className="input"
            placeholder="来源，如 官方模考 2（选填）"
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
          />
        )}
      </div>
      <button type="button" className="btn-primary w-full" onClick={handleAdd} disabled={!draft.word.trim()}>
        + 加入生词本
      </button>
    </div>
  );
}
