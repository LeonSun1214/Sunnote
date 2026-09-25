import { useState } from 'react';
import type { Exam, ExamPlan } from '../types';
import { EXAM_LABELS, EXAM_ORDER } from '../config/exams';
import { useAppData } from '../store/hooks';
import { TARGET_SCALES, clampTarget, daysUntil, formatTarget } from '../utils/plan';
import type { ExamPlans } from '../utils/plan';

export function PlanPage() {
  const { data, updateSettings } = useAppData();
  const plans: ExamPlans = data.settings.plans ?? {};

  const setPlan = (exam: Exam, plan: ExamPlan) => {
    const cleaned: ExamPlan = {};
    if (plan.date) cleaned.date = plan.date;
    if (plan.target !== undefined) cleaned.target = plan.target;
    // 两项都空就把这个考试整个去掉 —— 「没填」在数据里就是没这个键，仪表盘按这个判断
    const next: ExamPlans = { ...plans };
    if (cleaned.date === undefined && cleaned.target === undefined) delete next[exam];
    else next[exam] = cleaned;
    updateSettings({ plans: next });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">考试计划</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          填了考试日期，仪表盘顶部就会显示离最近一场考试还有几天。这些和其它设置存在一起，跟着 JSON 备份一起导出。
        </p>
      </header>

      {EXAM_ORDER.map((exam) => (
        <ExamPlanCard key={exam} exam={exam} plan={plans[exam]} onChange={(next) => setPlan(exam, next)} />
      ))}
    </div>
  );
}

function ExamPlanCard({
  exam,
  plan,
  onChange,
}: {
  exam: Exam;
  plan: ExamPlan | undefined;
  onChange: (next: ExamPlan) => void;
}) {
  const scale = TARGET_SCALES[exam];
  const dateId = `plan-${exam}-date`;
  const targetId = `plan-${exam}-target`;

  /**
   * 目标分输入框的本地草稿。半档量程下用户敲到「6.」「6.3」时还不能收敛，
   * 所以只在值已经落在量程上时同步进设置，剩下的等失焦再收进量程。
   */
  const [draft, setDraft] = useState<string | null>(null);

  const commitTarget = (raw: string) => {
    if (raw.trim() === '') {
      onChange({ ...plan, target: undefined });
      return;
    }
    const clamped = clampTarget(exam, Number(raw));
    if (clamped !== null) onChange({ ...plan, target: clamped });
  };

  const days = plan?.date ? daysUntil(plan.date) : null;
  const filled = Boolean(plan?.date) || plan?.target !== undefined;

  const parts: string[] = [];
  if (days !== null) {
    if (days > 0) parts.push(`距考试还有 ${days} 天`);
    else if (days === 0) parts.push('考试就是今天');
    else parts.push(`考试日期已过 ${-days} 天，仪表盘不再显示倒计时`);
  }
  if (plan?.target !== undefined) parts.push(`目标 ${formatTarget(exam, plan.target)}`);
  if (filled && days === null) parts.push('填了日期，仪表盘才会显示倒计时');
  const status = filled ? `${parts.join(' · ')}。` : '还没填。';

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{EXAM_LABELS[exam]}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{scale.hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={dateId}>
            考试日期
          </label>
          <input
            id={dateId}
            className="input"
            type="date"
            value={plan?.date ?? ''}
            onChange={(e) => onChange({ ...plan, date: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="label" htmlFor={targetId}>
            目标分
          </label>
          <input
            id={targetId}
            className="input tabular-nums"
            type="number"
            inputMode={scale.step < 1 ? 'decimal' : 'numeric'}
            min={scale.min}
            max={scale.max}
            step={scale.step}
            placeholder={scale.placeholder}
            value={draft ?? plan?.target ?? ''}
            onFocus={() => setDraft(plan?.target === undefined ? '' : String(plan.target))}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              const n = Number(raw);
              if (raw !== '' && clampTarget(exam, n) === n) commitTarget(raw);
            }}
            onBlur={() => {
              if (draft !== null) commitTarget(draft);
              setDraft(null);
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{status}</p>
        {filled && (
          <button
            type="button"
            className="btn-ghost shrink-0"
            onClick={() => {
              setDraft(null);
              onChange({});
            }}
          >
            清除
          </button>
        )}
      </div>
    </section>
  );
}
