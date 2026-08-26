import type { Subject } from '../types';

/**
 * 四科主色。取自 dataviz 参考色板已验证的槽位（blue / green / yellow / violet），
 * 每种模式各有自己的步进值 —— 深色不是浅色的自动翻转。
 *
 * 用 scripts/validate_palette.js 按本应用的实际卡片底色跑过：
 *   light on #ffffff  → 全部 PASS（yellow 对比度 2.17，靠旁边的文字标签兜底）
 *   dark  on #0f172a  → 全部 PASS（yellow↔green CVD ΔE 6.9，同样靠文字标签兜底）
 * 所以规矩是：任何用到科目色的地方，科目名必须以文字形式出现在旁边，
 * 绝不让颜色单独承担识别。
 */
export const SUBJECT_HEX: Record<Subject, { light: string; dark: string }> = {
  listening: { light: '#2a78d6', dark: '#3987e5' }, // blue
  reading: { light: '#008300', dark: '#008300' },   // green
  writing: { light: '#eda100', dark: '#c98500' },   // yellow
  speaking: { light: '#4a3aa7', dark: '#9085e9' },  // violet
};

/** CSS 变量名，深浅两套值在 index.css 里一处切换。 */
export function subjectVar(subject: Subject): string {
  return `var(--subj-${subject})`;
}

/** 科目主色的常用样式。颜色走 CSS 变量，避免 Tailwind 扫不到动态类名。 */
export const SUBJECT_STYLES: Record<Subject, { text: string; bgSoft: string; border: string }> = {
  listening: { text: 'text-subj-listening', bgSoft: 'bg-subj-listening-soft', border: 'border-subj-listening' },
  reading: { text: 'text-subj-reading', bgSoft: 'bg-subj-reading-soft', border: 'border-subj-reading' },
  writing: { text: 'text-subj-writing', bgSoft: 'bg-subj-writing-soft', border: 'border-subj-writing' },
  speaking: { text: 'text-subj-speaking', bgSoft: 'bg-subj-speaking-soft', border: 'border-subj-speaking' },
};

/**
 * 正确率的文字配色。这是文本不是图元，所以按文字对比度选色，
 * 而且百分比数字本身永远在场 —— 颜色只是强化，不单独承担意义。
 * 分档对齐 70% 分流线：低于它在新版考试里就意味着进不了 Upper。
 */
export function accuracyTone(value: number | null): string {
  if (value === null) return 'text-slate-400 dark:text-slate-500';
  if (value >= 0.85) return 'text-emerald-700 dark:text-emerald-400';
  if (value >= 0.7) return 'text-slate-700 dark:text-slate-200';
  if (value >= 0.5) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
