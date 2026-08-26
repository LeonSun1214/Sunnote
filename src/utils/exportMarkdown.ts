import type { AppData } from '../types';
import { SUBJECT_LIST, getTaskType, taskTypeLabel } from '../config/subjects';
import { blocksTotals, formatAccuracy, sessionAccuracy } from './stats';
import { formatDate } from './date';

/**
 * 把错题笔记、生词和句型导成一份 Markdown。
 * 用途是复习时在别的地方打开看（备忘录、Obsidian、打印），
 * 不是备份 —— 备份走 JSON，那个才能导回来。
 */
export function exportMarkdown(data: AppData): string {
  const lines: string[] = ['# Sunnote 托福复习本', '', `导出时间：${formatDate(new Date().toISOString())}`, ''];

  for (const config of SUBJECT_LIST) {
    const notes = data.notes
      .filter((n) => n.subject === config.key)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const sessions = data.sessions
      .filter((s) => s.subject === config.key)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (notes.length === 0 && sessions.length === 0) continue;

    lines.push(`## ${config.label} ${config.labelEn}`, '');

    if (sessions.length > 0) {
      lines.push('### 练习记录', '');
      lines.push('| 日期 | 套题 | 走向 | 题数 | 错题 | 正确率 | Band |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- |');
      for (const s of sessions) {
        const { total, wrong } = blocksTotals(s.blocks);
        const path = s.path ? (s.path === 'upper' ? 'Upper' : 'Lower') : '—';
        lines.push(
          `| ${formatDate(s.date)} | ${s.setName} | ${path} | ${total || '—'} | ${total ? wrong : '—'} | ${formatAccuracy(sessionAccuracy(s))} | ${s.band ?? '—'} |`,
        );
      }
      lines.push('');

      const withDetail = sessions.filter((s) => s.summary || s.tasks.some((t) => t.reflection));
      if (withDetail.length > 0) {
        lines.push('#### 练习小结', '');
        for (const s of withDetail) {
          lines.push(`**${s.setName} · ${formatDate(s.date)}**`, '');
          if (s.summary) lines.push(s.summary, '');
          for (const task of s.tasks) {
            if (!task.reflection) continue;
            lines.push(`- ${getTaskType(config.key, task.taskType)?.label ?? task.taskType}（自评 ${task.selfScore}/5）：${task.reflection}`);
          }
          lines.push('');
        }
      }
    }

    if (notes.length > 0) {
      lines.push('### 错题笔记', '');
      for (const note of notes) {
        lines.push(`#### ${note.title}`, '');
        const meta = [
          note.taskType ? taskTypeLabel(config.key, note.taskType) : null,
          note.tags.length > 0 ? note.tags.map((t) => `#${t}`).join(' ') : null,
        ].filter(Boolean);
        if (meta.length > 0) lines.push(`> ${meta.join(' · ')}`, '');
        if (note.body) lines.push(note.body, '');
      }
    }
  }

  if (data.vocab.length > 0) {
    const FAMILIARITY = ['生', '眼熟', '会用', '掌握'];
    lines.push('## 生词本', '');
    lines.push('| 单词 | 释义 | 熟练度 | 来源 |');
    lines.push('| --- | --- | --- | --- |');
    for (const v of [...data.vocab].sort((a, b) => a.familiarity - b.familiarity)) {
      lines.push(`| ${v.word} | ${v.meaning || '—'} | ${FAMILIARITY[v.familiarity]} | ${v.source ?? '—'} |`);
    }
    lines.push('');
  }

  if (data.phrases.length > 0) {
    const CATEGORY_LABELS: Record<string, string> = {
      grammar: '语法点',
      transition: '连接词',
      writing: '写作句型',
      speaking: '口语句型',
    };
    lines.push('## 句型 / 表达库', '');
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      const items = data.phrases.filter((p) => p.category === key);
      if (items.length === 0) continue;
      lines.push(`### ${label}`, '');
      for (const p of items) {
        lines.push(`- ${p.text}${p.usage ? ` — ${p.usage}` : ''}`);
        if (p.example) lines.push(`  - 例：${p.example}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** 触发浏览器下载。数据全在本地，不经过任何服务器。 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
