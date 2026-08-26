import type { Subject, SubjectConfig, TaskTypeConfig } from '../../types';
import { listeningConfig } from './listening';
import { readingConfig } from './reading';
import { writingConfig } from './writing';
import { speakingConfig } from './speaking';

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfig> = {
  listening: listeningConfig,
  reading: readingConfig,
  writing: writingConfig,
  speaking: speakingConfig,
};

/** 导航和仪表盘的固定顺序，跟真实考试的科目顺序一致。 */
export const SUBJECT_ORDER: Subject[] = ['listening', 'reading', 'writing', 'speaking'];

export const SUBJECT_LIST: SubjectConfig[] = SUBJECT_ORDER.map((s) => SUBJECT_CONFIGS[s]);

export function getSubjectConfig(subject: Subject): SubjectConfig {
  return SUBJECT_CONFIGS[subject];
}

export function isSubject(value: string): value is Subject {
  return value in SUBJECT_CONFIGS;
}

export function getTaskType(subject: Subject, taskTypeKey: string): TaskTypeConfig | undefined {
  return SUBJECT_CONFIGS[subject].taskTypes.find((t) => t.key === taskTypeKey);
}

/** 题型的显示名。找不到配置时退回 key，避免历史数据渲染成空白。 */
export function taskTypeLabel(subject: Subject, taskTypeKey: string): string {
  return getTaskType(subject, taskTypeKey)?.label ?? taskTypeKey;
}

export { listeningConfig, readingConfig, writingConfig, speakingConfig };
