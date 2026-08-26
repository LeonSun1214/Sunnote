import type { ReactNode } from 'react';

/** 统一的 tooltip 外壳。文字一律用 ink 色，不跟着系列色走。 */
export function TooltipShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-medium text-slate-900 dark:text-slate-100">{title}</p>
      <div className="space-y-0.5 text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  );
}

export function TooltipRow({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <p className="flex items-center gap-1.5 tabular-nums">
      {swatch && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: swatch }} aria-hidden />}
      <span>{label}</span>
      <span className="ml-auto font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </p>
  );
}
