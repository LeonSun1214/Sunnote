import type { Exam, Skill, Subject, SubjectConfig, TaskTypeConfig } from '../../types';
import { listeningConfig } from './toefl/listening';
import { readingConfig } from './toefl/reading';
import { writingConfig } from './toefl/writing';
import { speakingConfig } from './toefl/speaking';
import { ieltsListeningConfig } from './ielts/listening';
import { ieltsReadingConfig } from './ielts/reading';
import { ieltsWritingConfig } from './ielts/writing';
import { ieltsSpeakingConfig } from './ielts/speaking';

export const SUBJECT_CONFIGS: Record<Subject, SubjectConfig> = {
  'toefl-listening': listeningConfig,
  'toefl-reading': readingConfig,
  'toefl-writing': writingConfig,
  'toefl-speaking': speakingConfig,
  'ielts-listening': ieltsListeningConfig,
  'ielts-reading': ieltsReadingConfig,
  'ielts-writing': ieltsWritingConfig,
  'ielts-speaking': ieltsSpeakingConfig,
};

export const EXAM_ORDER: Exam[] = ['toefl', 'ielts'];

export const EXAM_LABELS: Record<Exam, string> = {
  toefl: '托福',
  ielts: '雅思',
};

/** 每个考试内部的科目顺序，和真实考试的顺序一致。 */
export const SKILL_ORDER: Skill[] = ['listening', 'reading', 'writing', 'speaking'];

export const SUBJECT_ORDER: Subject[] = EXAM_ORDER.flatMap((exam) =>
  SKILL_ORDER.map((skill) => `${exam}-${skill}` as Subject),
);

export const SUBJECT_LIST: SubjectConfig[] = SUBJECT_ORDER.map((s) => SUBJECT_CONFIGS[s]);

export function getSubjectConfig(subject: Subject): SubjectConfig {
  return SUBJECT_CONFIGS[subject];
}

export function isSubject(value: string): value is Subject {
  return value in SUBJECT_CONFIGS;
}

/** 跨考试的场合用全名，光写「听力」分不清是哪个考试的。 */
export function subjectFullLabel(subject: Subject): string {
  const config = SUBJECT_CONFIGS[subject];
  return `${EXAM_LABELS[config.exam]}${config.label}`;
}

/** 某个考试下的四科，按考试顺序。 */
export function subjectsOfExam(exam: Exam): SubjectConfig[] {
  return SKILL_ORDER.map((skill) => SUBJECT_CONFIGS[`${exam}-${skill}` as Subject]);
}

export function getTaskType(subject: Subject, taskTypeKey: string): TaskTypeConfig | undefined {
  return SUBJECT_CONFIGS[subject].taskTypes.find((t) => t.key === taskTypeKey);
}

/** 题型的显示名。找不到配置时退回 key，避免历史数据渲染成空白。 */
export function taskTypeLabel(subject: Subject, taskTypeKey: string): string {
  return getTaskType(subject, taskTypeKey)?.label ?? taskTypeKey;
}

export {
  listeningConfig,
  readingConfig,
  writingConfig,
  speakingConfig,
  ieltsListeningConfig,
  ieltsReadingConfig,
  ieltsWritingConfig,
  ieltsSpeakingConfig,
};
