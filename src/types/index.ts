/** 托福四科。新版 2026 格式。 */
export type Subject = 'listening' | 'reading' | 'writing' | 'speaking';

/** 自适应模块。听力/阅读为 Router → Upper 或 Lower 两段式。 */
export type ModuleKind = 'router' | 'upper' | 'lower';

/** Router 之后被分流到的那一边。 */
export type AdaptivePath = 'upper' | 'lower';

/**
 * 客观题组：一个模块内某个题型的对错统计。
 * 覆盖听力/阅读的每个题型分组、写作的 Build a Sentence、口语的 Listen and Repeat。
 */
export interface ObjectiveBlock {
  id: string;
  /** 听力/阅读有模块归属；写作口语为 null。 */
  module: ModuleKind | null;
  /** 对应科目 config 里 taskTypes 的 key。 */
  taskType: string;
  total: number;
  wrong: number;
  /** 本题组速记，比如「第 12 题同义改写没认出」。 */
  note?: string;
}

/** 主观题：Write an Email / Academic Discussion / Take an Interview。 */
export interface SubjectiveTask {
  id: string;
  taskType: string;
  /** 自评分 0–5。 */
  selfScore: number;
  durationSec?: number;
  /** 仅写作使用。 */
  wordCount?: number;
  /** 勾中的扣分维度 id，取自 config 里该题型的 rubric。 */
  rubricHits: string[];
  /** 自己的答案原文，口语则是转写。 */
  answer?: string;
  reflection?: string;
}

/** 一次练习记录。 */
export interface Session {
  id: string;
  subject: Subject;
  /** 套题名，如「官方模考 2」。 */
  setName: string;
  /** ISO 日期字符串。 */
  date: string;
  /** 听力/阅读：Router 之后走到哪一边。 */
  path?: AdaptivePath;
  blocks: ObjectiveBlock[];
  tasks: SubjectiveTask[];
  /** Band 1–6，实际得分或自评。 */
  band?: number;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

/** 错题笔记：对错题的知识积累。 */
export interface Note {
  id: string;
  subject: Subject;
  title: string;
  /** Markdown 正文。 */
  body: string;
  tags: string[];
  /** 可选关联到某个题型 / 某次练习。 */
  taskType?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

/** 熟练度：0 生 / 1 眼熟 / 2 会用 / 3 掌握。 */
export type Familiarity = 0 | 1 | 2 | 3;

export interface VocabEntry {
  id: string;
  word: string;
  meaning: string;
  example?: string;
  /** 来源套题。 */
  source?: string;
  familiarity: Familiarity;
  createdAt: string;
  updatedAt: string;
}

export type PhraseCategory = 'grammar' | 'transition' | 'writing' | 'speaking';

export interface PhraseEntry {
  id: string;
  text: string;
  category: PhraseCategory;
  usage?: string;
  example?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export type ThemeSetting = 'light' | 'dark' | 'system';

export interface AppSettings {
  /** 上次导出备份的时间，用来提醒备份。 */
  lastExportedAt?: string;
  theme: ThemeSetting;
}

/** 整个应用的持久化状态。 */
export interface AppData {
  version: number;
  sessions: Session[];
  notes: Note[];
  vocab: VocabEntry[];
  phrases: PhraseEntry[];
  settings: AppSettings;
}

/* ------------------------------------------------------------------ */
/* 科目配置：四科差异的单一真相源                                        */
/* ------------------------------------------------------------------ */

export interface RubricItem {
  id: string;
  label: string;
}

export interface ModuleConfig {
  key: ModuleKind;
  label: string;
  minutes: number;
  /** 必答（计分）题数。加试题不录入。 */
  scoredItems: number;
  /** 该模块能拿到的最高 Band。 */
  maxBand?: number;
  /** 给用户看的一句话说明。 */
  hint?: string;
}

export interface TaskTypeConfig {
  key: string;
  label: string;
  /** 英文原词，保留 ETS 说法便于对题。 */
  labelEn?: string;
  kind: 'objective' | 'subjective';
  /**
   * 客观题在各模块下的固定题数。
   *
   * 键同时表达可用性 —— 不在表里就代表该模块没有这个题型（比如听力的
   * Announcement 不进 Upper、阅读的 Academic passages 不进 Lower）。
   * 非自适应科目（写作/口语）没有模块，用 'none' 键，和 blockKey 的约定一致。
   *
   * 题数是固定的，所以录入时只填错了几个，不用再填总数。
   */
  items?: Partial<Record<ModuleKind | 'none', number>>;
  /** 官方给的答题时间。 */
  minutes?: number;
  /** 写作字数目标区间。 */
  wordRange?: [number, number];
  /** 口语单题时长。 */
  responseSeconds?: number;
  /** 该题型有几道题。主观题用，如 Take an Interview 有 4 题。默认 1。 */
  count?: number;
  /** 主观题的扣分维度。 */
  rubric?: RubricItem[];
  /**
   * 客观题的录入形态。
   * stepper：填总数 + 错题数，适合题数不定的听力/阅读。
   * dots：题数固定且很少时逐题点对错，比如口语的 7 句跟读。
   */
  inputStyle?: 'stepper' | 'dots';
  /** 录入界面上的提示。 */
  hint?: string;
}

export interface SubjectConfig {
  key: Subject;
  label: string;
  labelEn: string;
  /** 听力/阅读为 true：有 Router → Upper/Lower 的两段式结构。 */
  adaptive: boolean;
  modules?: ModuleConfig[];
  /**
   * Router 进 Upper 的正确率门槛。ETS 未公布，这是实例观察值，
   * 放在 config 里方便后续按经验调整。
   */
  routingThreshold?: number;
  taskTypes: TaskTypeConfig[];
  /** Tailwind 主色 token 名，见 tailwind.config.js。 */
  color: string;
  /** 科目页顶部的一句话说明。 */
  blurb: string;
}
