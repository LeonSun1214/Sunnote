import { useMemo, useState } from 'react';
import type { PhraseCategory, Session, SubjectConfig } from '../../types';
import { useAppData } from '../../store/hooks';
import { taskTypeLabel } from '../../config/exams';
import { relativeTime } from '../../utils/date';
import { cx } from '../../utils/ui';
import { NoteForm } from '../notes/NoteForm';
import { VocabForm } from '../vocab/VocabForm';
import { PhraseForm, PHRASE_CATEGORIES } from '../phrases/PhraseForm';

export type PanelTab = 'notes' | 'vocab' | 'phrases';

export const PANEL_TABS: { key: PanelTab; label: string; icon: string }[] = [
  { key: 'notes', label: '错题笔记', icon: '📝' },
  { key: 'vocab', label: '生词', icon: '🔤' },
  { key: 'phrases', label: '句型', icon: '🧩' },
];

export function isPanelTab(value: string | null): value is PanelTab {
  return value === 'notes' || value === 'vocab' || value === 'phrases';
}

interface Props {
  session: Session;
  config: SubjectConfig;
  tab: PanelTab;
  /** 从某个题型旁的「记笔记」进来时带上，新笔记预填这个题型。 */
  presetTaskType?: string;
  onTabChange: (tab: PanelTab) => void;
  onClose: () => void;
}

/**
 * 练习详情右侧的面板：这套题攒下的笔记 / 生词 / 句型，就地看、就地记。
 *
 * 录入的东西自动挂上 sessionId，不用跳页、不用手填来源。
 * 桌面端并排在详情右边（用户要的是「在一个试卷里看」，所以不遮挡）；
 * 手机上 384px 的侧栏放不下，改成全屏覆盖。
 */
export function SessionPanel({ session, config, tab, presetTaskType, onTabChange, onClose }: Props) {
  const { data } = useAppData();

  const notes = useMemo(
    () => data.notes.filter((n) => n.sessionId === session.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes, session.id],
  );
  const vocab = useMemo(
    () => data.vocab.filter((v) => v.sessionId === session.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.vocab, session.id],
  );
  const phrases = useMemo(
    () => data.phrases.filter((p) => p.sessionId === session.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.phrases, session.id],
  );
  const counts: Record<PanelTab, number> = { notes: notes.length, vocab: vocab.length, phrases: phrases.length };

  return (
    <aside
      aria-label={`${session.setName} 的笔记面板`}
      className={cx(
        // 手机：全屏覆盖
        'fixed inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-950',
        // 桌面：并排，跟着滚动保持可见
        'lg:sticky lg:top-8 lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-4rem)] lg:w-96 lg:shrink-0 lg:self-start lg:rounded-xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm lg:dark:border-slate-800 lg:dark:bg-slate-900',
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{session.setName}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">这套题攒下的东西</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭面板"
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ×
        </button>
      </header>

      <div className="flex gap-1 border-b border-slate-200 px-3 pt-2 dark:border-slate-800">
        {PANEL_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTabChange(t.key)}
            aria-pressed={tab === t.key}
            className={cx(
              'flex-1 rounded-t-lg px-2 py-1.5 text-xs transition',
              tab === t.key
                ? 'border-b-2 border-slate-900 font-medium text-slate-900 dark:border-slate-100 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {t.label}
            {counts[t.key] > 0 && <span className="ml-1 opacity-60">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'notes' && <NotesTab session={session} config={config} presetTaskType={presetTaskType} />}
        {tab === 'vocab' && <VocabTab session={session} />}
        {tab === 'phrases' && <PhrasesTab session={session} />}
      </div>
    </aside>
  );
}

/* ───────────────────────── 错题笔记 ───────────────────────── */

function NotesTab({ session, config, presetTaskType }: { session: Session; config: SubjectConfig; presetTaskType?: string }) {
  const { data, addNote, updateNote, removeNote } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  // 保存后换 key 让新建表单清空 —— NoteForm 只在挂载时读 initial
  const [formNonce, setFormNonce] = useState(0);

  const notes = useMemo(
    () => data.notes.filter((n) => n.sessionId === session.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes, session.id],
  );
  const editing = editingId ? notes.find((n) => n.id === editingId) : undefined;

  if (editing) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          编辑笔记
          {editing.taskType && (
            <span className="ml-1.5 chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {taskTypeLabel(config.key, editing.taskType)}
            </span>
          )}
        </p>
        <NoteForm
          key={editing.id}
          compact
          autoFocus
          initial={{ title: editing.title, body: editing.body, tags: editing.tags }}
          onSave={(draft) => {
            updateNote(editing.id, draft);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
          onDelete={() => {
            if (!window.confirm('删除这条笔记？此操作不可撤销。')) return;
            removeNote(editing.id);
            setEditingId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          新笔记
          {presetTaskType && (
            <span className="ml-1.5 chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {taskTypeLabel(config.key, presetTaskType)}
            </span>
          )}
        </p>
        <NoteForm
          key={`new:${presetTaskType ?? ''}:${formNonce}`}
          compact
          autoFocus
          onSave={(draft) => {
            addNote({ subject: config.key, ...draft, taskType: presetTaskType, sessionId: session.id });
            setFormNonce((n) => n + 1);
          }}
        />
      </section>

      {notes.length > 0 && (
        <section>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">这套题的笔记 · {notes.length}</p>
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setEditingId(note.id)}
                  className="block w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium">{note.title || '（无标题）'}</p>
                    <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{relativeTime(note.updatedAt)}</span>
                  </div>
                  {note.body && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{note.body}</p>}
                  {(note.taskType || note.tags.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {note.taskType && (
                        <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {taskTypeLabel(config.key, note.taskType)}
                        </span>
                      )}
                      {note.tags.map((tag) => (
                        <span key={tag} className="chip bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── 生词 ───────────────────────── */

function VocabTab({ session }: { session: Session }) {
  const { data, addVocab, removeVocab } = useAppData();
  const vocab = useMemo(
    () => data.vocab.filter((v) => v.sessionId === session.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.vocab, session.id],
  );

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">来源自动填成「{session.setName}」</p>
        <VocabForm
          compact
          showSource={false}
          onAdd={(draft) => addVocab({ ...draft, familiarity: 0, sessionId: session.id, source: session.setName })}
        />
      </section>

      {vocab.length > 0 && (
        <section>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">这套题的生词 · {vocab.length}</p>
          <ul className="space-y-1.5">
            {vocab.map((v) => (
              <li
                key={v.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{v.word}</p>
                  {v.meaning && <p className="text-xs text-slate-500 dark:text-slate-400">{v.meaning}</p>}
                  {v.example && <p className="mt-0.5 text-[11px] italic text-slate-400 dark:text-slate-500">{v.example}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeVocab(v.id)}
                  aria-label={`删除生词 ${v.word}`}
                  className="shrink-0 text-slate-400 transition hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── 句型 ───────────────────────── */

function PhrasesTab({ session }: { session: Session }) {
  const { data, addPhrase, removePhrase } = useAppData();
  const [category, setCategory] = useState<PhraseCategory>('grammar');
  const phrases = useMemo(
    () => data.phrases.filter((p) => p.sessionId === session.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.phrases, session.id],
  );
  const label = (c: PhraseCategory) => PHRASE_CATEGORIES.find((x) => x.key === c)?.label ?? c;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {PHRASE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cx(
                'chip border transition',
                category === c.key
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <PhraseForm category={category} onAdd={(draft) => addPhrase({ ...draft, sessionId: session.id, source: session.setName })} />
      </section>

      {phrases.length > 0 && (
        <section>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">这套题的句型 · {phrases.length}</p>
          <ul className="space-y-1.5">
            {phrases.map((p) => (
              <li
                key={p.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm">{p.text}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span>{label(p.category)}</span>
                    {p.usage && <span>{p.usage}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removePhrase(p.id)}
                  aria-label="删除这条句型"
                  className="shrink-0 text-slate-400 transition hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
