# Sunnote

自用的托福备考笔记。按**新版 2026 自适应格式**建模，四科各有贴合真实考试结构的录入界面：填错题数自动算正确率，每科都有错题笔记区，外加生词本和句型库。

数据存在浏览器本地（localStorage），不上传任何服务器。

## 为什么是这个结构

新版托福四科的真实结构决定了这个应用长什么样：

| 科目 | 结构 | 客观题（数对错） | 主观题 |
| --- | --- | --- | --- |
| 听力 | Router **20 题** → Upper **15 题**（封顶 Band 6）或 Lower **15 题**（封顶 Band 4），必答共 35 题 | 全部：Choose a Response / Conversations / Announcements / Academic Talks（**Academic Talks 不进 Lower**） | 无 |
| 阅读 | 同为两段自适应：Router **20 题** → Upper / Lower **15 题**，必答共 35 题 | 全部：词汇填空 / 短篇实用文本 / 学术长文 | 无 |
| 写作 | 约 23 分钟，三个题型顺序固定 | Build a Sentence（10 题语法，6 分钟） | Write an Email（7 分钟，130–140 词）、Academic Discussion（10 分钟，100–130 词） |
| 口语 | 约 8 分钟 | Listen and Repeat（7 句跟读） | Take an Interview（4 题 × 45 秒，无准备时间） |

全部按 Band 1–6 计分。**加试题不计分，所以不录入**。

关键指标是 **Router 达线率**：Router 答对约 14/20（70%）以上才能进 Upper，进不去分数就封顶 Band 4。这条线比总正确率更要紧，所以仪表盘和每科统计页都单独盯它。

> 70% 这个门槛 ETS 没有公开，是实例观察值。要调就改 `src/config/subjects/{listening,reading}.ts` 里的 `routingThreshold`，一行的事。

## 功能

- **四科定制录入**：听力/阅读走 Router → Upper/Lower 的模块流程，选到 Lower 时 Academic Talks 自动禁用；写作有字数计数器和目标区间校验；口语的 7 句跟读是逐句打点，采访题带 45 秒倒计时
- **正确率**：按题组、模块、整套三层实时计算，题数为 0 时显示「—」而不是 0%
- **错题笔记**：每科独立，Markdown 正文 + 标签 + 搜索。从练习详情点某个错的题组就能记，科目、题型、来源套题自动带上
- **生词本**：熟练度四档、搜索、随机抽查（遮住释义）
- **句型库**：语法点 / 连接词 / 写作句型 / 口语句型分类
- **统计**：正确率走势、题型排行（弱的在上）、分模块对比、常犯扣分点
- **备份**：导出 / 导入 JSON（支持覆盖与合并），另可导出 Markdown 复习本；超过 7 天没备份会在仪表盘提醒
- 深浅色主题、手机可用、装成 PWA 后能离线打开

## 开发

```bash
npm install
npm run dev        # 本地开发
npm test           # stats 与 storage 的单测
npm run build      # 生产构建
node smoke.mjs     # 端到端冒烟测试（需先跑起 dev server）
```

端到端测试用 Playwright，会截图到 `SHOTS` 指定的目录：

```bash
npm run dev &
SHOTS=./shots node smoke.mjs
```

## 部署

推到 `main` 会由 GitHub Actions 构建并发布到 GitHub Pages（`.github/workflows/deploy.yml`）。仓库的 Settings → Pages 里把 Source 设成 “GitHub Actions” 即可。

生产构建的 `base` 是 `/Sunnote/`；换仓库名要同步改 `vite.config.ts`。

## 代码结构

```
src/
  types/            全部类型定义
  config/subjects/  四科配置 —— 题型、模块、题数、评分维度都在这里，是「定制化」的单一真相源
  store/            localStorage 读写、版本迁移、React Context
  utils/stats.ts    正确率与聚合的纯函数（有单测）
  components/       通用录入与图表组件
  pages/            页面
```

要加题型或改题数，只动 `src/config/subjects/` 下对应的文件，UI 会跟着变，不用改组件代码。

## 数据安全

数据只存在浏览器的 localStorage 里。**清缓存、换浏览器、换设备都会丢**，所以：

- 定期在设置页导出 JSON 备份
- 导入时选「合并」能保留两边的记录（同一条以修改时间更新的为准），选「覆盖」会丢掉当前全部数据
