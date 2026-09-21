/** 支持的考试。 */
export type Exam = 'toefl' | 'ielts';

/** 四项技能。两个考试都考这四样，只是结构和计分不同。 */
export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';

/**
 * 科目 = 考试 + 技能，共 8 个值。
 *
 * 用复合键而不是给每条记录单加一个 exam 字段：代码里绝大多数地方只是把
 * Subject 当不透明的键用（查配置、过滤、当路由参数、取颜色），扩键几乎
 * 不用改逻辑；加字段则要动近百处。
 */
export type Subject = `${Exam}-${Skill}`;

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
/* 科目配置：各科差异的单一真相源（两个考试 × 四科 = 八份）              */
/* ------------------------------------------------------------------ */

export interface RubricItem {
  id: string;
  label: string;
}

/** 原始分区间对应的 Band。min/max 都含端点。 */
export interface BandBracket {
  min: number;
  max: number;
  band: number;
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
   * stepper：只填错题数（题数由 items 固定）。
   * dots：题数固定且很少时逐题点对错，比如托福口语的 7 句跟读。
   */
  inputStyle?: 'stepper' | 'dots';
  /**
   * 题数每套都会浮动时设为 true，界面上多给一个题数输入框。
   * 雅思阅读三篇常见 13/13/14 但不固定；托福题数是定死的，不设这个标志。
   */
  editableTotal?: boolean;
  /** 主观题自评分的量程。托福 0–5 整档，雅思 0–9 半档。默认 0–5 整档。 */
  scoreScale?: { min: number; max: number; step: number };
  /** 录入界面上的提示。 */
  hint?: string;
}

export interface SubjectConfig {
  key: Subject;
  exam: Exam;
  skill: Skill;
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
  /**
   * 这一科可选的总分档位。托福是 Band 1–6 半档，雅思是 4–9 半档。
   * 雅思理论上到 0，但 0–9 半档有 19 个按钮太挤，而备考留学的实际区间就在
   * 4 以上。要放宽改这个数组即可。
   */
  bandOptions: number[];
  /** 原始分换算 Band 的区间表，从高到低。只有雅思听力/阅读有。 */
  bandTable?: BandBracket[];
  /** Tailwind 主色 token 名，见 tailwind.config.js。 */
  color: string;
  /** 科目页顶部的一句话说明。 */
  blurb: string;
}
