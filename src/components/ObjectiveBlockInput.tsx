import type { ObjectiveBlock, TaskTypeConfig } from '../types';
import { AccuracyBadge } from './AccuracyBadge';
import { NumberStepper } from './NumberStepper';
import { accuracy } from '../utils/stats';
import { cx } from '../utils/ui';

interface Props {
  config: TaskTypeConfig;
  block: ObjectiveBlock;
  onChange: (patch: Partial<ObjectiveBlock>) => void;
  /** 该题型在当前模块不可用时禁用，并说明原因（如 Academic Talks 不进 Lower）。 */
  disabledReason?: string;
}

export function ObjectiveBlockInput({ config, block, onChange, disabledReason }: Props) {
  const disabled = Boolean(disabledReason);
  const acc = accuracy(block.total, block.wrong);
  const wrongExceedsTotal = block.total > 0 && block.wrong > block.total;

  return (
    <div
      className={cx(
        'rounded-lg border p-3 transition',
        disabled
          ? 'border-dashed border-slate-200 bg-slate-50/50 opacity-60 dark:border-slate-800 dark:bg-slate-900/30'
          : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {config.label}
            {config.labelEn && (
              <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">{config.labelEn}</span>
            )}
          </p>
          {disabledReason ? (
            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">{disabledReason}</p>
          ) : (
            config.hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{config.hint}</p>
          )}
        </div>
        {!disabled && <AccuracyBadge value={acc} detail={{ total: block.total, wrong: block.wrong }} size="sm" />}
      </div>

      {!disabled &&
        (config.inputStyle === 'dots' ? (
          <DotRow
            total={block.total}
            wrong={block.wrong}
            onChange={(wrong) => onChange({ wrong })}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <NumberStepper
              label="题目总数"
              value={block.total}
              min={0}
              onChange={(total) => onChange({ total, wrong: Math.min(block.wrong, total) })}
            />
            <NumberStepper
              label="错题数"
              value={block.wrong}
              min={0}
              max={Math.max(block.total, 0)}
              error={wrongExceedsTotal ? '错题数不能超过总数' : undefined}
              onChange={(wrong) => onChange({ wrong })}
            />
          </div>
        ))}
    </div>
  );
}

/**
 * 逐题打点：点亮的圆点表示这题做错了。
 * 只在题数固定且很少时用（口语跟读 7 句），比填两个数字快。
 */
function DotRow({ total, wrong, onChange }: { total: number; wrong: number; onChange: (wrong: number) => void }) {
  // 只存错题数，不存具体哪几题错。点第 n 个圆点 = 「错了 n 个」，
  // 再点同一个圆点则取消到 n-1，操作上等价于一个可点的进度条。
  return (
    <div>
      <span className="label">点掉做错的题（点第几个就是错了几个）</span>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(total, 0) }, (_, i) => {
          const isWrong = i < wrong;
          return (
            <button
              key={i}
              type="button"
              aria-label={`第 ${i + 1} 题${isWrong ? '（已标记为错）' : ''}`}
              aria-pressed={isWrong}
              onClick={() => onChange(isWrong && i === wrong - 1 ? i : i + 1)}
              className={cx(
                'h-9 w-9 rounded-full border text-xs font-medium tabular-nums transition',
                isWrong
                  ? 'border-red-400 bg-red-500 text-white dark:border-red-600'
                  : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
