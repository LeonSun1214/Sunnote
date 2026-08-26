import type { SubjectiveTask, TaskTypeConfig } from '../types';
import { Countdown } from './Countdown';
import { cx } from '../utils/ui';

interface Props {
  config: TaskTypeConfig;
  task: SubjectiveTask;
  onChange: (patch: Partial<SubjectiveTask>) => void;
  /** 同一题型有多题时的序号，如 Take an Interview 的第 1–4 题。 */
  index?: number;
}

/** 英文按空白切分即可；写作评分看的是词数不是字符数。 */
function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function SubjectiveTaskInput({ config, task, onChange, index }: Props) {
  const words = task.wordCount ?? 0;
  const [minWords, maxWords] = config.wordRange ?? [];
  const wordsOff =
    config.wordRange && words > 0 && (words < (minWords ?? 0) || words > (maxWords ?? Infinity));

  const timerSeconds = config.responseSeconds ?? (config.minutes ? config.minutes * 60 : 0);

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-sm font-medium">
            {config.label}
            {index != null && <span className="ml-1 text-slate-400 dark:text-slate-500">#{index}</span>}
            {config.labelEn && (
              <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">{config.labelEn}</span>
            )}
          </p>
          {config.hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{config.hint}</p>}
        </div>
        {timerSeconds > 0 && (
          <Countdown
            seconds={timerSeconds}
            onFinish={(elapsed) => onChange({ durationSec: elapsed })}
          />
        )}
      </div>

      <div className="mb-3">
        <span className="label">自评分</span>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              aria-pressed={task.selfScore === score}
              onClick={() => onChange({ selfScore: score })}
              className={cx(
                'h-9 flex-1 rounded-lg border text-sm font-medium tabular-nums transition',
                task.selfScore === score
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600',
              )}
            >
              {score}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="label">
          我的答案{config.key === 'take_an_interview' ? '（口语转写）' : ''}
          {config.wordRange && (
            <span className={cx('ml-2 font-normal tabular-nums', wordsOff ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500')}>
              {words} 词 / 目标 {minWords}–{maxWords}
              {wordsOff && (words < (minWords ?? 0) ? ' · 偏少' : ' · 偏多')}
            </span>
          )}
        </span>
        <textarea
          className="input min-h-24 resize-y font-normal"
          rows={4}
          placeholder={config.key === 'take_an_interview' ? '把自己说的内容转写下来，方便回看语法和用词' : '粘贴或手打你的答案'}
          value={task.answer ?? ''}
          onChange={(e) => {
            const answer = e.target.value;
            onChange(config.wordRange ? { answer, wordCount: countWords(answer) } : { answer });
          }}
        />
      </div>

      {config.rubric && config.rubric.length > 0 && (
        <div className="mb-3">
          <span className="label">这次的扣分点（可多选）</span>
          <div className="flex flex-wrap gap-1.5">
            {config.rubric.map((item) => {
              const active = task.rubricHits.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      rubricHits: active
                        ? task.rubricHits.filter((id) => id !== item.id)
                        : [...task.rubricHits, item.id],
                    })
                  }
                  className={cx(
                    'chip border transition',
                    active
                      ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
                      : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <span className="label">反思（下次怎么改）</span>
        <textarea
          className="input resize-y"
          rows={2}
          placeholder="比如：开头铺垫太长，导致最后论据没展开就没时间了"
          value={task.reflection ?? ''}
          onChange={(e) => onChange({ reflection: e.target.value })}
        />
      </div>
    </div>
  );
}
