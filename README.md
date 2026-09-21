# Sunnote

托福 + 雅思备考笔记。按真实考试结构建模——录完一套题只填「错了几个」，正确率、薄弱题型、分流达线率（托福）和估算 Band（雅思）自动算出来。

**👉 [打开使用](https://leonsun1214.github.io/Sunnote/)** · 免费 · 无需注册 · 数据只存在你自己的浏览器里

![Sunnote 仪表盘](docs/screenshot.png)

## 它解决什么问题

刷完一套题，你知道自己错了几个，但不知道**错在哪类题上**。一个月后想不起来上次讲座题是不是也这么差。

Sunnote 让你花一分钟录完一套题，然后：

- 每个题型的正确率横着排开，**最弱的排最上面**
- 盯住托福的 **Router 达线率**——新版考试里 Router 答对不到 14/20 就进不了 Upper，分数直接封顶 Band 4。这条线比总正确率更要紧
- 雅思对了几题**当场换算成 Band**，不用去翻换算表
- 错题笔记按科目归档，做题时随手记，复习时搜得到

两个考试各自独立记录、独立统计，生词本和句型库共用。

## 托福：按新版 2026 自适应格式录入

**听力 / 阅读**：Router 20 题定分流 → 进 Upper 或 Lower 各 15 题。选好走向后，那个模块没有的题型会自动隐藏。

| 听力题型 | Router | Upper | Lower |
| --- | :-: | :-: | :-: |
| Choose a Response | 8 | 3 | 7 |
| Conversation | 4 | 4 | 4 |
| Announcement | 4 | — | 4 |
| Lecture | 4 | 8 | — |

| 阅读题型 | Router | Upper | Lower |
| --- | :-: | :-: | :-: |
| Vocabulary | 10 | 10 | 10 |
| Short Texts | 5 | — | 5 |
| Academic Passages | 5 | 5 | — |

题数是固定的，所以**只填错了几个**。没填的按全错算——这样漏填哪一块会立刻变成刺眼的低分，而不是悄悄算成满分。

**写作**：Build a Sentence 数对错；Email 和学术讨论按自评分（0–5）记录，答案框实时数词并对照目标区间（130–140 / 100–130 词）。

**口语**：Listen and Repeat 七句逐句点；Take an Interview 四题各带 45 秒倒计时和转写框。

## 雅思：Academic，按 Part / 篇目录入

**听力**：4 个 Part 各 10 题，共 40 题。Part 1 日常对话 / Part 2 日常独白 / Part 3 学术讨论 / Part 4 学术讲座。

**阅读**：3 篇学术长文共 40 题。预填 13 / 13 / 14，但**每篇题数可以改**——真题里的分配每套都不一样。

按 Part / 篇目记而不是按题型记，是因为雅思的题型分布每套浮动，配对题这套 6 道下套 3 道，按题型统计攒不出趋势。

填完错题数，旁边会显示 `对 32/40 ≈ Band 7.5（估算）`，**点一下才填进 Band 选择器**，不会悄悄覆盖你手填的真实成绩。

> ⚠️ 雅思官方从不公布原始分换算表，且明确说过分数线随每套题难度浮动。应用里用的是网上多个来源一致的通行版本，**只能当估算**。表在 `src/config/exams/ielts/bands.ts`，想按自己的数据调就改那里。

**写作**：Task 1 图表报告（≥150 词）+ Task 2 议论文（≥250 词），按官方四项评分标准（Task Achievement / Coherence and Cohesion / Lexical Resource / Grammatical Range and Accuracy）打 0–9 半档。

**口语**：Part 1 日常问答 / Part 2 个人陈述（1 分钟准备 + 1–2 分钟说，带倒计时）/ Part 3 深入讨论，按四项标准（Fluency and Coherence / Lexical Resource / Grammatical Range and Accuracy / Pronunciation）自评。

## 还有

- **生词本**——熟练度四档、随机抽查（遮住释义自己先想）
- **句型库**——语法点 / 连接词 / 写作句型 / 口语句型，两个考试共用
- **备份**——一键导出 JSON，也能导出 Markdown 复习本拿去打印
- 深浅色主题，手机能用，装成 App 后离线也能打开

## 你的数据在哪

**只在你自己的浏览器里。** 没有服务器，没有账号，一次网络请求都不发。

代价是：**清缓存、换浏览器、换设备都会丢**。所以：

- 定期在设置页导出 JSON 备份
- 超过 7 天没导出，仪表盘会提醒你
- 换设备就把 JSON 导入过去，可以选覆盖或合并

## 本地跑

```bash
npm install
npm run dev
```

其他命令：

```bash
npm test           # 单元测试
npm run build      # 生产构建
npm run e2e        # 端到端测试（需先起 dev server 和 npx playwright install chromium）
```

推到 `main` 会自动构建并发布到 GitHub Pages。

## 想加科目或改数字

每个科目的题型、题数、评分标准都写在 `src/config/exams/<考试>/<科目>.ts` 里，页面只是照着配置渲染。改数字不用碰界面代码。

两个已知的估值，都在 config 里明确标着：

- **托福 Router 进 Upper 的 70% 门槛**——ETS 没公开，这是根据实例观察的估值。改 `src/config/exams/toefl/listening.ts` 和 `reading.ts` 里的 `routingThreshold`
- **雅思原始分换算 Band 的表**——见上面那条警告，改 `src/config/exams/ielts/bands.ts`
