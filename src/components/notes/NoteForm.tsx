import { useState } from 'react';
import { MarkdownBody } from './MarkdownBody';
import { cx } from '../../utils/ui';

/** 常用错因，点一下就成标签，省得每次手打。 */
const QUICK_TAGS = ['没听懂', '同义改写', '时间不够', '粗心', '生词', '语法', '题目理解偏', '思路慢'];

export interface NoteDraft {
  title: string;
  body: string;
  tags: string[];
}

interface Props {
  initial?: NoteDraft;
  onSave: (draft: NoteDraft) => void;
  /** 有就显示删除按钮（编辑已有笔记时）。 */
  onDelete?: () => void;
  /** 有就显示取消按钮（面板里的编辑态需要退回列表）。 */
  onCancel?: () => void;
  /** 面板里空间窄，正文框矮一点。 */
  compact?: boolean;
  autoFocus?: boolean;
}

/**
 * 错题笔记的表单本体：标题 / 正文（Markdown 预览）/ 标签 / 常用错因。
 * 独立页面和练习详情的面板共用这一份 —— 两边的差别只在尺寸和按钮，不在字段。
 *
 * 状态在挂载时从 initial 读一次。换一条笔记编辑时调用方要换 key 强制重挂载，
 * 和 SessionForm / NoteEditorPage 的约定一致。
 */
export function NoteForm({ initial, onSave, onDelete, onCancel, compact = false, autoFocus = false }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag]);
  };

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  return (
    <div className="space-y-3">
      <div>
        <span className="label">标题</span>
        <input
          className="input"
          placeholder="如：Academic Talks 里的转折信号词"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={autoFocus}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label !mb-0">正文（支持 Markdown）</span>
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline dark:text-slate-400"
            onClick={() => setPreview(!preview)}
          >
            {preview ? '继续编辑' : '预览'}
          </button>
        </div>
        {preview ? (
          <div
            className={cx(
              'prose-sm rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800',
              compact ? 'min-h-24' : 'min-h-40',
            )}
          >
            <MarkdownBody source={body} />
          </div>
        ) : (
          <textarea
            className={cx('input resize-y font-mono text-[13px]', compact ? 'min-h-24' : 'min-h-40')}
            rows={compact ? 5 : 10}
            placeholder={'错在哪：\n正确思路：\n下次怎么办：'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}
      </div>

      <div>
        <span className="label">标签</span>
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="chip border border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
              >
                #{tag} ×
              </button>
            ))}
          </div>
        )}
        <input
          className="input"
          placeholder="输入标签后回车"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            addTag(tagInput);
            setTagInput('');
          }}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="chip border border-slate-300 text-slate-500 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => onSave({ title: title.trim() || '（无标题）', body, tags })}
          disabled={!canSave}
        >
          保存
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            取消
          </button>
        )}
        {onDelete && (
          <button type="button" className="btn-danger" onClick={onDelete}>
            删除
          </button>
        )}
      </div>
    </div>
  );
}
