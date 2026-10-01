import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppData } from '../../store/hooks';
import { useSubjectParam } from './useSubjectParam';
import type { SubjectConfig } from '../../types';
import { NoteForm } from '../../components/notes/NoteForm';
import { formatDate } from '../../utils/date';

/** 和 SessionForm 同理：换科目或换笔记只是 hash 变化，得用 key 强制重挂载。 */
export function NoteEditorPage() {
  const config = useSubjectParam();
  const { noteId } = useParams();

  if (!config) return <Navigate to="/" replace />;
  return <NoteEditorInner key={`${config.key}:${noteId ?? 'new'}`} config={config} noteId={noteId} />;
}

/**
 * 独立的笔记编辑页。表单本体在 NoteForm 里，和练习详情的面板共用。
 * 这个页面保留给科目笔记列表的「新建 / 编辑」入口，以及老书签里的
 * ?session=&taskType= 深链。
 */
function NoteEditorInner({ config, noteId }: { config: SubjectConfig; noteId?: string }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, addNote, updateNote, removeNote } = useAppData();

  const existing = noteId ? data.notes.find((n) => n.id === noteId) : undefined;

  // 从练习详情跳过来时把上下文带上，不用再手填一遍
  const presetSessionId = existing?.sessionId ?? searchParams.get('session') ?? undefined;
  const presetTaskType = existing?.taskType ?? searchParams.get('taskType') ?? undefined;
  const linkedSession = presetSessionId ? data.sessions.find((s) => s.id === presetSessionId) : undefined;

  if (noteId && !existing) return <Navigate to={`/${config.key}`} replace />;

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

      <div className="card">
        <NoteForm
          initial={existing ? { title: existing.title, body: existing.body, tags: existing.tags } : undefined}
          autoFocus={!existing}
          onSave={(draft) => {
            const payload = { subject: config.key, ...draft, taskType: presetTaskType, sessionId: presetSessionId };
            if (existing) updateNote(existing.id, payload);
            else addNote(payload);
            navigate(`/${config.key}?tab=notes`);
          }}
          onDelete={
            existing
              ? () => {
                  if (!window.confirm('删除这条笔记？此操作不可撤销。')) return;
                  removeNote(existing.id);
                  navigate(`/${config.key}?tab=notes`);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
