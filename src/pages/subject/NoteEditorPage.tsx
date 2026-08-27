import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAppData } from '../../store/hooks';
import { useSubjectParam } from './useSubjectParam';
import type { SubjectConfig } from '../../types';
import { cx } from '../../utils/ui';
import { formatDate } from '../../utils/date';

/** 常用错因，点一下就成标签，省得每次手打。 */
const QUICK_TAGS = ['没听懂', '同义改写', '时间不够', '粗心', '生词', '语法', '题目理解偏', '思路慢'];

/** 和 SessionForm 同理：换科目或换笔记只是 hash 变化，得用 key 强制重挂载。 */
export function NoteEditorPage() {
  const config = useSubjectParam();
  const { noteId } = useParams();

  if (!config) return <Navigate to="/" replace />;
  return <NoteEditorInner key={`${config.key}:${noteId ?? 'new'}`} config={config} noteId={noteId} />;
}

function NoteEditorInner({ config, noteId }: { config: SubjectConfig; noteId?: string }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, addNote, updateNote, removeNote } = useAppData();

  const existing = noteId ? data.notes.find((n) => n.id === noteId) : undefined;

  // 从练习详情跳过来时把上下文带上，不用再手填一遍
  const presetSessionId = existing?.sessionId ?? searchParams.get('session') ?? undefined;
  const presetTaskType = existing?.taskType ?? searchParams.get('taskType') ?? undefined;
  const linkedSession = presetSessionId ? data.sessions.find((s) => s.id === presetSessionId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);

  if (noteId && !existing) return <Navigate to={`/${config.key}`} replace />;

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (!tag || tags.includes(tag)) return;
    setTags([...tags, tag]);
  };

  const handleSave = () => {
    const payload = {
      subject: config.key,
      title: title.trim() || '（无标题）',
      body,
      tags,
      taskType: presetTaskType,
      sessionId: presetSessionId,
    };
    if (existing) updateNote(existing.id, payload);
    else addNote(payload);
    navigate(`/${config.key}?tab=notes`);
  };

  const handleDelete = () => {
    if (!existing) return;
    if (!window.confirm('删除这条笔记？此操作不可撤销。')) return;
    removeNote(existing.id);
    navigate(`/${config.key}?tab=notes`);
  };

  const taskTypeConfig = presetTaskType ? config.taskTypes.find((t) => t.key === presetTaskType) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <button type="button" className="mb-2 text-xs text-slate-500 hover:underline dark:text-slate-400" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="text-xl font-semibold">{existing ? '编辑' : '新建'}错题笔记 · {config.label}</h1>
        {(linkedSession || taskTypeConfig) && (
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {taskTypeConfig && (
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {taskTypeConfig.label}
              </span>
            )}
            {linkedSession && (
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                来自 {linkedSession.setName} · {formatDate(linkedSession.date)}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="card space-y-3">
        <div>
          <span className="label">标题</span>
          <input
            className="input"
            placeholder="如：Academic Talks 里的转折信号词"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={!existing}
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
            <div className="prose-sm min-h-40 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
              <MarkdownBody source={body} />
            </div>
          ) : (
            <textarea
              className="input min-h-40 resize-y font-mono text-[13px]"
              rows={10}
              placeholder={'错在哪：\n正确思路：\n下次怎么办：'}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          )}
        </div>

        <div>
          <span className="label">标签</span>
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
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" onClick={handleSave} disabled={!title.trim() && !body.trim()}>
          保存
        </button>
        {existing && (
          <button type="button" className="btn-danger" onClick={handleDelete}>
            删除
          </button>
        )}
      </div>
    </div>
  );
}

/** Markdown 渲染。样式手写而不引 typography 插件，省一个依赖。 */
export function MarkdownBody({ source }: { source: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5">{children}</ol>,
        code: ({ children }) => (
          <code className={cx('rounded bg-slate-100 px-1 py-0.5 text-[0.9em] dark:bg-slate-800')}>{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-2 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-400">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
