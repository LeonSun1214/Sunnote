import { useState } from 'react';
import type { PhraseCategory } from '../../types';

export interface PhraseDraft {
  text: string;
  category: PhraseCategory;
  usage?: string;
  example?: string;
}

/** 句型库的四个分类和各自的提示。全局页面的筛选 chips 和面板里的分类选择都从这儿取。 */
export const PHRASE_CATEGORIES: { key: PhraseCategory; label: string; hint: string }[] = [
  { key: 'grammar', label: '语法点', hint: '托福写作的 Build a Sentence 直接考语法结构，雅思写作的 Grammatical Range 也看这个。' },
  { key: 'transition', label: '连接词', hint: '转折、递进、举例、总结，听力抓信号词也靠它。' },
  { key: 'writing', label: '写作句型', hint: '托福 Email 的开头结尾、学术讨论里回应同学观点；雅思 Task 1 描述趋势、Task 2 亮观点的说法。' },
  { key: 'speaking', label: '口语句型', hint: '托福 Take an Interview 45 秒没准备时间，雅思 Part 2 只有 1 分钟 —— 都得有现成的起手句。' },
];

interface Props {
  /** 分类由调用方控制：全局页面的 chips 同时也筛选列表，面板里则是表单自己的一行。 */
  category: PhraseCategory;
  onAdd: (draft: PhraseDraft) => void;
}

/** 句型录入表单。全局句型库页面和练习详情的面板共用。 */
export function PhraseForm({ category, onAdd }: Props) {
  const [draft, setDraft] = useState({ text: '', usage: '', example: '' });
  const label = PHRASE_CATEGORIES.find((c) => c.key === category)?.label ?? '句型';

  const handleAdd = () => {
    if (!draft.text.trim()) return;
    onAdd({
      text: draft.text.trim(),
      category,
      usage: draft.usage.trim() || undefined,
      example: draft.example.trim() || undefined,
    });
    setDraft({ text: '', usage: '', example: '' });
  };

  return (
    <div className="space-y-2">
      <textarea
        className="input resize-y"
        rows={2}
        placeholder={`新的${label}`}
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
        + 加进{label}
      </button>
    </div>
  );
}
