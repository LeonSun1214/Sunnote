import type { Skill, Subject } from '../types';
import { SUBJECT_CONFIGS } from '../config/exams';

/**
 * 四项技能的主色。取自 dataviz 参考色板已验证的槽位（blue / green / yellow / violet），
 * 每种模式各有自己的步进值 —— 深色不是浅色的自动翻转。
 * 托福和雅思共用这四个颜色，按技能对应。
 *
 * 用 scripts/validate_palette.js 按本应用的实际卡片底色跑过：
 *   light on #ffffff  → 全部 PASS（yellow 对比度 2.17，靠旁边的文字标签兜底）
 *   dark  on #0f172a  → 全部 PASS（yellow↔green CVD ΔE 6.9，同样靠文字标签兜底）
 * 所以规矩是：任何用到科目色的地方，科目名必须以文字形式出现在旁边，
 * 绝不让颜色单独承担识别。
 */
export const SKILL_HEX: Record<Skill, { light: string; dark: string }> = {
  listening: { light: '#2a78d6', dark: '#3987e5' }, // blue
  reading: { light: '#008300', dark: '#008300' },   // green
  writing: { light: '#eda100', dark: '#c98500' },   // yellow
  speaking: { light: '#4a3aa7', dark: '#9085e9' },  // violet
};

/**
 * CSS 变量名，深浅两套值在 index.css 里一处切换。
 * 和 subjectStyle 同样的兜底理由：历史数据里可能有配置里已经没有的 subject，
 * 画得不完美也好过整页崩掉 —— 崩了用户就够不到导出按钮了。
 */
export function subjectVar(subject: Subject): string {
  return `var(--subj-${SUBJECT_CONFIGS[subject]?.skill ?? 'listening'})`;
}

const SKILL_STYLES: Record<Skill, { text: string; bgSoft: string; border: string }> = {
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
/**
 * 科目主色的常用样式。
 * 按技能取色而不是按科目 —— 听力两科都是蓝、阅读都是绿。颜色编码的是
 * 「哪项技能」，考试靠导航分组和标签区分。这样两个考试共用四个已经过
 * CVD 校验的颜色，不用再配四个（参考色板到 8 色就到上限了）。
 */
export function subjectStyle(subject: Subject): (typeof SKILL_STYLES)[Skill] {
  // 历史数据里可能有已经不在配置里的 subject，兜底到听力的样式而不是崩掉
  return SKILL_STYLES[SUBJECT_CONFIGS[subject]?.skill ?? 'listening'];
}

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
