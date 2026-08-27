import type { AdaptivePath, ModuleConfig, SubjectConfig } from '../types';
import { itemsNeededToPass } from '../utils/stats';
import { cx } from '../utils/ui';

interface Props {
  config: SubjectConfig;
  value: AdaptivePath;
  onChange: (path: AdaptivePath) => void;
}

/**
 * Router → Upper / Lower 的走向选择。
 * 真实考试里 Router 的表现决定去哪边，所以这里选的是「这次实际被分到哪边」。
 */
export function ModulePathPicker({ config, value, onChange }: Props) {
  const router = config.modules?.find((m) => m.key === 'router');
  const upper = config.modules?.find((m) => m.key === 'upper');
  const lower = config.modules?.find((m) => m.key === 'lower');
  if (!router || !upper || !lower) return null;

  const needed = itemsNeededToPass(router.scoredItems, config.routingThreshold ?? 0.7);

  return (
    <div className="card">
      <p className="text-sm font-medium">这次的模块走向</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Router {router.scoredItems} 题定分流，答对约 {needed} 题以上进 Upper。选你这次实际做到的那一边。
      </p>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex shrink-0 flex-col justify-center rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm font-medium">Router</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{router.scoredItems} 题</span>
        </div>
        <div className="flex items-center text-slate-400 dark:text-slate-600">→</div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <PathOption module={upper} selected={value === 'upper'} onSelect={() => onChange('upper')} tone="emerald" />
          <PathOption module={lower} selected={value === 'lower'} onSelect={() => onChange('lower')} tone="amber" />
        </div>
      </div>
    </div>
  );
}

function PathOption({
  module,
  selected,
  onSelect,
  tone,
}: {
  module: ModuleConfig;
  selected: boolean;
  onSelect: () => void;
  tone: 'emerald' | 'amber';
}) {
  const selectedClass =
    tone === 'emerald'
      ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'
      : 'border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        'rounded-lg border px-3 py-2 text-left transition',
        selected ? selectedClass : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
      )}
    >
      <span className="block text-sm font-medium">{module.label}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
        {module.scoredItems} 题 · 封顶 Band {module.maxBand}
      </span>
    </button>
  );
}
