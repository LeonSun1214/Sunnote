import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173';
const SHOTS = process.env.SHOTS ?? './shots';
const errors = [];

await mkdir(SHOTS, { recursive: true });

// 浏览器路径：CI 上 `playwright install chromium` 会装到 Playwright 自己找得到的
// 地方，直接 launch 即可；有些开发环境用的是预装在别处的 Chromium 且禁止下载，
// 那种情况用 PLAYWRIGHT_EXECUTABLE_PATH 指过去。
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
let browser;
try {
  browser = await chromium.launch(executablePath ? { executablePath } : {});
} catch (error) {
  console.error('启动 Chromium 失败。');
  console.error('  CI 上先跑：npx playwright install --with-deps chromium');
  console.error('  用预装浏览器的环境：PLAYWRIGHT_EXECUTABLE_PATH=<chromium 路径> npm run e2e');
  throw error;
}
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(`console: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
// 确认框一律接受 —— 清空和导入都会连弹两次
page.on('dialog', (d) => d.accept());

const step = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.log(`  ✗ ${name}: ${e.message.split('\n')[0]}`); errors.push(`${name}: ${e.message.split('\n')[0]}`); }
};

/** 非自适应科目（雅思、托福写作口语）：所有题型在同一个卡片里，直接按标签找。 */
const fillWrongByLabel = async (taskLabel, wrong) => {
  const box = page.locator('div.rounded-lg').filter({ hasText: taskLabel }).first();
  await box.getByRole('spinbutton', { name: /^错题数/ }).fill(String(wrong));
};

/** 自适应科目：先按模块 h2 定位 section，再在里面找题型。 */
const fillWrong = async (sectionText, taskLabel, wrong) => {
  const section = page.locator('section').filter({ has: page.locator('h2', { hasText: sectionText }) }).first();
  const box = section.locator('div.rounded-lg').filter({ hasText: taskLabel }).first();
  await box.getByRole('spinbutton', { name: /^错题数/ }).fill(String(wrong));
};

console.log('— 空状态 —');
await page.goto(BASE, { waitUntil: 'networkidle' });
await step('仪表盘空状态渲染', () => page.getByText('从录第一次练习开始').waitFor({ timeout: 5000 }));
await page.screenshot({ path: `${SHOTS}/01-dashboard-empty.png` });

console.log('— 听力录入 —');
await page.goto(`${BASE}/#/toefl-listening/new`, { waitUntil: 'networkidle' });
await step('听力表单打开', () => page.getByText('这次的模块走向').waitFor({ timeout: 5000 }));
await step('刚打开时错题数为空，Router 显示 20/20', async () => {
  const router = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Router' }) }).first();
  await router.getByText('20/20').waitFor({ timeout: 3000 });
  const first = page.locator('div.rounded-lg').filter({ hasText: '选回应' }).first();
  const v = await first.getByRole('spinbutton', { name: /^错题数/ }).inputValue();
  if (v !== '') throw new Error(`错题数框应该是空的，实际 "${v}"`);
});
await step('输入框没有加减按钮，直接敲数字', async () => {
  const n = await page.getByRole('button', { name: /加一|减一/ }).count();
  if (n !== 0) throw new Error(`不该还有加减按钮，实际有 ${n} 个`);
});
await step('填套题名', () => page.getByPlaceholder(/官方模考/).fill('官方模考 2'));

// Router 固定 20 题（选回应 8 + 对话 4 + 通知 4 + 讲座 4），错 6 → 答对 14/20 = 70%，刚好压线
await step('填 Router 四个题型的错题数（共错 6）', async () => {
  await fillWrong('Router', '选回应', 2);
  await fillWrong('Router', '对话', 1);
  await fillWrong('Router', '通知', 2);
  await fillWrong('Router', '讲座', 1);
});
await step('Router 压线提示：答对 14 题正好过 70%', () =>
  page.getByText(/过了 70% 分流线/).first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/02-listening-form.png`, fullPage: true });

await step('切到 Lower 后讲座那一栏整个消失', async () => {
  await page.getByRole('button', { name: /^Lower/ }).first().click();
  const lower = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Lower' }) }).first();
  await lower.getByText('选回应').first().waitFor({ timeout: 3000 });
  const n = await lower.locator('div.rounded-lg').filter({ hasText: '讲座' }).count();
  if (n !== 0) throw new Error(`Lower 不该出现讲座，实际有 ${n} 栏`);
});
await page.screenshot({ path: `${SHOTS}/03-lower-disabled.png`, fullPage: true });

await step('切回 Upper 后 Router 已填的错题数没被清掉', async () => {
  await page.getByRole('button', { name: /^Upper/ }).first().click();
  const v = await page.locator('section').filter({ has: page.locator('h2', { hasText: 'Router' }) }).first()
    .locator('div.rounded-lg').filter({ hasText: '选回应' }).first()
    .getByRole('spinbutton', { name: /^错题数/ }).inputValue();
  if (v !== '2') throw new Error(`Router 选回应错题数应为 2，实际 ${v}`);
});

await step('Upper 里通知那一栏整个消失（只有 Router 和 Lower 有通知）', async () => {
  const upper = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Upper' }) }).first();
  await upper.getByText('选回应').first().waitFor({ timeout: 3000 });
  const n = await upper.locator('div.rounded-lg').filter({ hasText: '通知' }).count();
  if (n !== 0) throw new Error(`Upper 不该出现通知，实际有 ${n} 栏`);
  // Upper 应该正好剩三栏：选回应、对话、讲座
  const rows = await upper.locator('div.rounded-lg').filter({ hasText: /题$|错题数/ }).count();
  if (rows !== 3) throw new Error(`Upper 应有 3 个题型，实际 ${rows}`);
});

// Upper 固定 15 题（选回应 3 + 对话 4 + 讲座 8），错 3 → 12/15。
// 默认就是 0，答对的那些不用管，只填错了的。
await step('Band 可以选半档（1 到 6 共 11 个）', async () => {
  const band = page.locator('div').filter({ hasText: /^Band 得分/ }).last();
  for (const v of ['1', '5.5', '6']) {
    await band.getByRole('button', { name: v, exact: true }).waitFor({ timeout: 3000 });
  }
  const n = await band.getByRole('button').count();
  if (n !== 11) throw new Error(`Band 应有 11 个选项（含半档），实际 ${n}`);
});
await step('填 Upper 错题数（共错 3）、选 Band 5.5 并保存', async () => {
  await fillWrong('Upper', '讲座', 3);
  await page.getByRole('button', { name: '5.5', exact: true }).click();
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/toefl-listening\/session\//, { timeout: 5000 });
});
await step('详情页显示 Band 5.5', () =>
  page.getByText('Band 5.5').waitFor({ timeout: 3000 }));
await step('详情页总正确率 = 26/35 = 74%', () =>
  page.getByText('74%').first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/04-session-detail.png`, fullPage: true });

console.log('— 从错题跳去记笔记 —');
await step('「记笔记」链接带上练习和题型上下文', async () => {
  await page.getByRole('link', { name: '记笔记' }).first().click();
  await page.waitForURL(/#\/toefl-listening\/note\/new/, { timeout: 5000 });
  await page.getByText('来自 官方模考 2').waitFor({ timeout: 3000 });
});
await step('写笔记并保存', async () => {
  await page.getByPlaceholder(/转折信号词/).fill('学术讲座的转折信号词');
  await page.locator('textarea').first().fill('错在哪：however 后面才是重点，我盯着前半句了。\n\n下次：听到 but / however / actually 立刻记后半句。');
  await page.getByRole('button', { name: '+ 没听懂' }).click();
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForURL(/tab=notes/, { timeout: 5000 });
  await page.getByText('学术讲座的转折信号词').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/05-notes.png`, fullPage: true });

// 阅读走「考砸」那条路径：Router 未达线 → Lower。听力测的是达线 → Upper，
// 所以未达线提示和 Lower 的完整保存至今没被跑到过。
console.log('— 阅读：Router 未达线 → Lower —');
await page.goto(`${BASE}/#/toefl-reading/new`, { waitUntil: 'networkidle' });
await step('阅读表单打开', () => page.getByText('这次的模块走向').waitFor({ timeout: 5000 }));
await step('选 Lower 路径', async () => {
  await page.getByPlaceholder(/官方模考/).fill('官方模考 3');
  await page.getByRole('button', { name: /^Lower/ }).first().click();
});
await step('Lower 下学术长文那一栏整个消失，只剩词汇和短篇', async () => {
  const lower = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Lower' }) }).first();
  await lower.getByText('词汇填空').first().waitFor({ timeout: 3000 });
  const n = await lower.locator('div.rounded-lg').filter({ hasText: '学术长文' }).count();
  if (n !== 0) throw new Error(`Lower 不该出现学术长文，实际有 ${n} 栏`);
  for (const label of ['词汇填空', '短篇实用文本']) {
    const box = lower.locator('div.rounded-lg').filter({ hasText: label }).first();
    await box.getByRole('spinbutton', { name: /^错题数/ }).waitFor({ timeout: 3000 });
  }
});

// Router 固定 20 题（词汇 10 + 短篇 5 + 长文 5），错 8 → 答对 12/20 = 60%，门槛 14 题，差 2
await step('填 Router 三个题型的错题数（共错 8）', async () => {
  await fillWrong('Router', '词汇填空', 4);
  await fillWrong('Router', '短篇实用文本', 2);
  await fillWrong('Router', '学术长文', 2);
});
await step('Router 未达线提示：答对 12 题，还差 2 题', async () => {
  await page.getByText(/还差 2 题/).first().waitFor({ timeout: 3000 });
  await page.getByText(/封顶 Band 4/).first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/06-reading-below-threshold.png`, fullPage: true });

// Lower 固定 15 题（词汇 10 + 短篇 5，没有长文），错 5 → 10/15
await step('填 Lower 错题数（共错 5）并保存', async () => {
  await fillWrong('Lower', '词汇填空', 3);
  await fillWrong('Lower', '短篇实用文本', 2);
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/toefl-reading\/session\//, { timeout: 5000 });
});
await step('详情页总正确率 = 22/35 = 63%', () =>
  page.getByText('63%').first().waitFor({ timeout: 3000 }));
await step('详情页标出 Router → Lower', () =>
  page.getByText('Router → Lower').waitFor({ timeout: 3000 }));
await step('详情页 Router 区块显示没过分流线', () =>
  page.getByText(/没过 70% 分流线/).first().waitFor({ timeout: 3000 }));
await page.screenshot({ path: `${SHOTS}/07-reading-detail.png`, fullPage: true });

await step('统计页出现 Lower 模块', async () => {
  await page.goto(`${BASE}/#/toefl-reading?tab=stats`, { waitUntil: 'networkidle' });
  const modules = page.locator('section').filter({ has: page.locator('h2', { hasText: '分模块正确率' }) });
  await modules.getByText('Lower').waitFor({ timeout: 3000 });
});

console.log('— 口语跟读打点（切科目不该串数据）—');
await page.goto(`${BASE}/#/toefl-speaking/new`, { waitUntil: 'networkidle' });
await step('跟读渲染出 7 个圆点', async () => {
  const n = await page.locator('button[aria-label^="第 "]').count();
  if (n !== 7) throw new Error(`应有 7 个圆点，实际 ${n}`);
});
await step('采访渲染出 4 张卡片', async () => {
  const n = await page.getByText(/^模拟采访\s*#\d/).count();
  if (n !== 4) throw new Error(`应有 4 张采访卡，实际 ${n}`);
});
await step('点第 2 个圆点 → 错 2 → 5/7 = 71%', async () => {
  await page.getByPlaceholder(/官方模考/).fill('口语练习 1');
  await page.getByRole('button', { name: '第 2 题' }).click();
  await page.getByText('71%').first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/08-speaking-dots.png`, fullPage: true });
await step('保存口语练习', async () => {
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/toefl-speaking\/session\//, { timeout: 5000 });
});

console.log('— 写作字数校验 —');
await page.goto(`${BASE}/#/toefl-writing/new`, { waitUntil: 'networkidle' });
await step('造句题固定 10 题，界面上没有总数输入', async () => {
  const box = page.locator('div.rounded-lg').filter({ hasText: '造句' }).first();
  await box.getByText('10 题').first().waitFor({ timeout: 3000 });
  const totalInputs = await box.getByRole('spinbutton', { name: '题目总数' }).count();
  if (totalInputs !== 0) throw new Error('题数已固定，不该还有总数输入框');
});
await step('造句题默认 0 错（10/10），填 2 后变 8/10', async () => {
  const box = page.locator('div.rounded-lg').filter({ hasText: '造句' }).first();
  const input = box.getByRole('spinbutton', { name: /^错题数/ });
  const initial = await input.inputValue();
  if (initial !== '') throw new Error(`造句题错题数框应该是空的，实际 "${initial}"`);
  await box.getByText('100%').first().waitFor({ timeout: 3000 });
  await input.fill('2');
  await box.getByText('80%').waitFor({ timeout: 3000 });
});
await step('Email 字数不够时提示偏少', async () => {
  await page.getByPlaceholder(/官方模考/).fill('写作练习 1');
  const email = page.locator('section').filter({ hasText: '写邮件' }).first();
  await email.getByPlaceholder(/粘贴或手打/).fill('This is a short reply that is nowhere near long enough for the task.');
  await page.getByText(/偏少/).first().waitFor({ timeout: 3000 });
});
await step('给 Email 打个自评分再保存', async () => {
  const email = page.locator('section').filter({ has: page.locator('h2', { hasText: '写邮件' }) }).first();
  await email.getByRole('button', { name: '3', exact: true }).click();
});
await page.screenshot({ path: `${SHOTS}/09-writing-words.png`, fullPage: true });
await step('保存写作练习', async () => {
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/toefl-writing\/session\//, { timeout: 5000 });
});

console.log('— 生词本 —');
await page.goto(`${BASE}/#/vocab`, { waitUntil: 'networkidle' });
await step('加生词', async () => {
  await page.getByPlaceholder('单词').fill('mitigate');
  await page.getByPlaceholder('释义').fill('减轻，缓合');   // 故意打错，下一步改掉
  await page.getByRole('button', { name: '+ 加入生词本' }).click();
  await page.getByText('mitigate').waitFor({ timeout: 3000 });
});
await step('编辑生词：改掉打错的释义，不用删了重加', async () => {
  await page.getByRole('button', { name: '编辑 mitigate' }).click();
  const meaning = page.getByRole('textbox', { name: '编辑释义' });
  await meaning.fill('减轻，缓和');
  await page.getByRole('textbox', { name: '编辑例句' }).fill('measures to mitigate the damage');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('减轻，缓和').waitFor({ timeout: 3000 });
  await page.getByText('measures to mitigate the damage').waitFor({ timeout: 3000 });
  const stale = await page.getByText('减轻，缓合').count();
  if (stale !== 0) throw new Error('旧释义还在，说明保存没生效');
});
await step('取消编辑不会改动数据', async () => {
  await page.getByRole('button', { name: '编辑 mitigate' }).click();
  await page.getByRole('textbox', { name: '编辑释义' }).fill('乱填的');
  await page.getByRole('button', { name: '取消' }).click();
  await page.getByText('减轻，缓和').waitFor({ timeout: 3000 });
  if ((await page.getByText('乱填的').count()) !== 0) throw new Error('取消之后改动不该留下');
});
await step('进入抽查模式', async () => {
  await page.getByRole('button', { name: '抽查模式' }).click();
  await page.getByRole('button', { name: '点开看释义' }).waitFor({ timeout: 3000 });
});

console.log('— 句型库 —');
await page.goto(`${BASE}/#/phrases`, { waitUntil: 'networkidle' });
await step('加一条语法点', async () => {
  await page.getByPlaceholder(/新的语法点/).fill('not only ... but also ...');
  await page.getByRole('button', { name: /加进语法点/ }).click();
  await page.getByText('not only ... but also ...').waitFor({ timeout: 3000 });
});
await step('编辑句型并改分类，条目会移到新分组', async () => {
  await page.getByRole('button', { name: '编辑这条' }).first().click();
  // 顶部的分类筛选和编辑框里的分类按钮同名，必须限定在编辑卡片内点
  const editCard = page.locator('li').filter({ has: page.getByRole('textbox', { name: '编辑句型' }) }).first();
  await editCard.getByRole('textbox', { name: '编辑用法' }).fill('并列强调，谓语跟 also 后面的主语一致');
  await editCard.getByRole('button', { name: '写作句型' }).click();
  await editCard.getByRole('button', { name: '保存', exact: true }).click();
  // 改成写作句型后，当前还停在语法点分组，所以这条应该消失了
  await page.waitForTimeout(300);
  if ((await page.getByText('not only ... but also ...').count()) !== 0) {
    throw new Error('改了分类后不该还留在语法点分组里');
  }
  await page.getByRole('button', { name: /^写作句型/ }).click();
  await page.getByText('not only ... but also ...').waitFor({ timeout: 3000 });
  await page.getByText('并列强调，谓语跟 also 后面的主语一致').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/10-vocab.png`, fullPage: true });

console.log('— 同一天两套：折线图左右顺序 —');
// 折线图原来只按日期排，同一天的两条比较结果为 0，稳定排序保留了输入顺序，
// 而输入是降序的，于是同一天的点在图上左右颠倒。
await page.goto(`${BASE}/#/toefl-listening/new`, { waitUntil: 'networkidle' });
await step('同一天再录一套听力（错得更多）', async () => {
  await page.getByPlaceholder(/官方模考/).fill('官方模考 3');
  await fillWrong('Router', '选回应', 6);
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/toefl-listening\/session\//, { timeout: 5000 });
});
await step('折线图上先录的在左、后录的在右', async () => {
  await page.goto(`${BASE}/#/toefl-listening?tab=stats`, { waitUntil: 'networkidle' });
  const svg = page.locator('svg[aria-label*="正确率走势"]').first();
  await svg.waitFor({ timeout: 3000 });
  // 悬停最左边的点，tooltip 应该是先录的那套
  const dots = svg.locator('rect[fill="transparent"]');
  await dots.first().hover();
  await page.getByText('官方模考 2').first().waitFor({ timeout: 3000 });
  await dots.last().hover();
  await page.getByText('官方模考 3').first().waitFor({ timeout: 3000 });
});

console.log('— 雅思听力：4 个 Part + Band 估算 —');
await page.goto(`${BASE}/#/ielts-listening`, { waitUntil: 'networkidle' });
await step('雅思页面打开，和托福是两套独立记录', async () => {
  await page.getByText('4 个 Part 各 10 题').first().waitFor({ timeout: 5000 });
  // 托福录过 3 套，雅思这边应该还是空的
  await page.getByText('还没有听力练习记录').waitFor({ timeout: 3000 });
});
await page.goto(`${BASE}/#/ielts-listening/new`, { waitUntil: 'networkidle' });
await step('4 个 Part 各 10 题，没有题数输入框', async () => {
  for (const label of ['Part 1', 'Part 2', 'Part 3', 'Part 4']) {
    await page.locator('div.rounded-lg').filter({ hasText: label }).first().getByText('10 题').waitFor({ timeout: 3000 });
  }
  const totals = await page.getByRole('spinbutton', { name: '题目总数' }).count();
  if (totals !== 0) throw new Error('听力题数固定，不该有题数输入框');
});
// 40 题错 8 → 对 32 → 听力表里 32 落在 7.5 档
await step('错 8 题 → 对 32 → 估算 Band 7.5', async () => {
  await page.getByPlaceholder(/官方模考/).fill('剑桥 18 Test 1');
  await fillWrongByLabel('Part 1', 0);
  await fillWrongByLabel('Part 2', 2);
  await fillWrongByLabel('Part 3', 3);
  await fillWrongByLabel('Part 4', 3);
  await page.getByText(/对 32\/40 题/).waitFor({ timeout: 3000 });
  await page.getByText('Band 7.5').first().waitFor({ timeout: 3000 });
});
await step('估算标明了不确定性，不是当成准确值', () =>
  page.getByText(/官方不公布换算表/).waitFor({ timeout: 3000 }));
await step('点估算把 7.5 填进 Band 选择器并保存', async () => {
  await page.getByText(/对 32\/40 题/).click();
  const band = page.locator('div').filter({ hasText: /^Band 得分/ }).last();
  const pressed = await band.getByRole('button', { name: '7.5', exact: true }).getAttribute('aria-pressed');
  if (pressed !== 'true') throw new Error('点估算之后 Band 7.5 应该被选中');
  await page.getByRole('button', { name: '保存这次练习' }).click();
  await page.waitForURL(/#\/ielts-listening\/session\//, { timeout: 5000 });
  await page.getByText('Band 7.5').first().waitFor({ timeout: 3000 });
});

console.log('— 雅思阅读：每篇题数可改 —');
await page.goto(`${BASE}/#/ielts-reading/new`, { waitUntil: 'networkidle' });
await step('三篇预填 13/13/14，且题数可改', async () => {
  const p3 = page.locator('div.rounded-lg').filter({ hasText: 'Passage 3' }).first();
  const total = p3.getByRole('spinbutton', { name: '题目总数' });
  const v = await total.inputValue();
  if (v !== '14') throw new Error(`Passage 3 应预填 14，实际 ${v}`);
  // 这套题分成 13/14/13，把第三篇改成 13
  await total.fill('13');
});
await step('题数改小后错题数跟着压下来，不留「错 14 共 13」', async () => {
  const p1 = page.locator('div.rounded-lg').filter({ hasText: 'Passage 1' }).first();
  await p1.getByRole('spinbutton', { name: /^错题数/ }).fill('13');
  await p1.getByRole('spinbutton', { name: '题目总数' }).fill('10');
  const wrong = await p1.getByRole('spinbutton', { name: /^错题数/ }).inputValue();
  if (wrong !== '10') throw new Error(`错题数该被压到 10，实际 ${wrong}`);
});

console.log('— 雅思写作：0–9 半档自评 —');
await page.goto(`${BASE}/#/ielts-writing/new`, { waitUntil: 'networkidle' });
await step('自评分是 0–9 半档共 19 档，不是托福的 0–5', async () => {
  const t1 = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Task 1' }) }).first();
  await t1.getByText('0–9').first().waitFor({ timeout: 3000 });
  await t1.getByRole('button', { name: '6.5', exact: true }).first().waitFor({ timeout: 3000 });
});
await step('Task 2 字数目标是 250 起，不是托福的 100–130', async () => {
  const t2 = page.locator('section').filter({ has: page.locator('h2', { hasText: 'Task 2' }) }).first();
  await t2.getByText(/目标 250/).waitFor({ timeout: 3000 });
});

console.log('— 托福数据没被雅思影响 —');
await step('托福听力的记录还在，且 Band 档位仍是 1–6', async () => {
  await page.goto(`${BASE}/#/toefl-listening`, { waitUntil: 'networkidle' });
  await page.getByText('官方模考 2').first().waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/#/toefl-listening/new`, { waitUntil: 'networkidle' });
  const band = page.locator('div').filter({ hasText: /^Band 得分/ }).last();
  const n = await band.getByRole('button').count();
  if (n !== 11) throw new Error(`托福 Band 应是 1–6 共 11 档，实际 ${n}`);
  if ((await band.getByRole('button', { name: '9', exact: true }).count()) !== 0) {
    throw new Error('托福不该出现 Band 9');
  }
});

console.log('— 持久化 —');
await page.goto(`${BASE}/#/toefl-listening`, { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await step('刷新后练习记录还在', () => page.getByText('官方模考 2').first().waitFor({ timeout: 5000 }));

console.log('— 统计 —');
await step('统计页渲染', async () => {
  await page.getByRole('button', { name: /^统计/ }).click();
  await page.getByText('题型正确率').waitFor({ timeout: 3000 });
  await page.getByText('Router 达线率').waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/11-stats.png`, fullPage: true });

console.log('— 仪表盘（有数据）—');
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await step('薄弱题型排行出现', () => page.getByText('薄弱题型').waitFor({ timeout: 3000 }));
await step('备份提醒出现（从没导出过）', () => page.getByText(/还没备份过/).waitFor({ timeout: 3000 }));
await step('Router 达线率 = 2/3（两套听力达线、阅读那套没达线）', async () => {
  // 三次 Router：听力模考2 14/20 达线、阅读模考3 12/20 没达线、听力模考3 14/20 达线。
  // 必须限定在这张卡片里取值 —— 页面别处也会出现同样的百分比数字。
  const tile = page.locator('div.card').filter({ hasText: 'Router 达线率' }).first();
  const text = await tile.innerText();
  if (!text.includes('67%')) throw new Error(`Router 达线率应为 67%，卡片内容：${text.replace(/\n/g, ' | ')}`);
  if (!text.includes('2/3')) throw new Error(`应显示 2/3 次，卡片内容：${text.replace(/\n/g, ' | ')}`);
});
await step('阅读的题型进入薄弱题型排行', async () => {
  const bars = page.locator('section').filter({ has: page.locator('h2', { hasText: '薄弱题型' }) });
  await bars.getByText('词汇填空').waitFor({ timeout: 3000 });
});
await step('概览按考试分成两组，每组四科', async () => {
  for (const [exam, label] of [
    ['toefl', '托福'],
    ['ielts', '雅思'],
  ]) {
    const group = page
      .locator('section')
      .filter({ has: page.locator('h2', { hasText: new RegExp(`^${label}$`) }) });
    const cards = group.locator(`a[href*="#/${exam}-"]`);
    const n = await cards.count();
    if (n !== 4) throw new Error(`${label}那组应有 4 张科目卡，实际 ${n}`);
  }
});
await step('薄弱题型排行里科目名带考试前缀，不然两个考试的「阅读」分不清', async () => {
  const bars = page.locator('section').filter({ has: page.locator('h2', { hasText: '薄弱题型' }) });
  await bars.getByText('托福阅读').first().waitFor({ timeout: 3000 });
});
await page.screenshot({ path: `${SHOTS}/12-dashboard-full.png`, fullPage: true });

console.log('— 导出导入往返 —');
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
let exported = null;
await step('导出 JSON 备份', async () => {
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await page.getByRole('button', { name: '导出 JSON 备份' }).click();
  const download = await dl;
  const fs = await import('node:fs/promises');
  exported = `${SHOTS}/backup.json`;
  await download.saveAs(exported);
  const parsed = JSON.parse(await fs.readFile(exported, 'utf8'));
  if (parsed.sessions.length !== 6) throw new Error(`备份里应有 6 次练习，实际 ${parsed.sessions.length}`);
  if (!parsed.sessions.some((s) => s.subject === 'ielts-listening')) throw new Error('备份里应有雅思听力记录');
  if (!parsed.sessions.some((s) => s.subject === 'toefl-listening')) throw new Error('备份里应有托福听力记录');
  if (!parsed.sessions.some((s) => s.band === 5.5)) throw new Error('备份里应存着 Band 5.5 这个半档分');
  if (parsed.notes.length !== 1) throw new Error(`备份里应有 1 条笔记，实际 ${parsed.notes.length}`);
  if (parsed.vocab.length !== 1) throw new Error(`备份里应有 1 个生词，实际 ${parsed.vocab.length}`);
  if (parsed.phrases.length !== 1) throw new Error(`备份里应有 1 条句型，实际 ${parsed.phrases.length}`);
  if (parsed.vocab[0].meaning !== '减轻，缓和') throw new Error(`备份里的释义应是编辑后的，实际 ${parsed.vocab[0].meaning}`);
  if (parsed.phrases[0].category !== 'writing') throw new Error(`备份里的句型分类应是编辑后的 writing，实际 ${parsed.phrases[0].category}`);
});
await step('清空数据', async () => {
  await page.getByRole('button', { name: '清空所有数据' }).click();
  await page.getByText('数据已清空').waitFor({ timeout: 5000 });
});
await step('导入后数据完整还原', async () => {
  await page.getByRole('button', { name: '覆盖' }).click();
  await page.locator('input[type=file]').setInputFiles(exported);
  await page.getByText(/已覆盖导入/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/#/toefl-listening`, { waitUntil: 'networkidle' });
  await page.getByText('官方模考 2').first().waitFor({ timeout: 5000 });
});

console.log('— 浅色模式 —');
await page.goto(`${BASE}/#/settings`, { waitUntil: 'networkidle' });
await step('切浅色', async () => {
  await page.getByRole('button', { name: '浅色' }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark'), { timeout: 3000 });
});
await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOTS}/13-light-mode.png`, fullPage: true });

console.log('— 手机视口 —');
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${BASE}/#/toefl-listening/new`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
await mobile.screenshot({ path: `${SHOTS}/14-mobile-form.png`, fullPage: true });
await step('手机端没有横向溢出', async () => {
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error('页面出现横向滚动');
});
await mobile.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await mobile.screenshot({ path: `${SHOTS}/15-mobile-dashboard.png`, fullPage: true });

await browser.close();

console.log('\n' + '='.repeat(52));
if (errors.length) {
  console.log(`发现 ${errors.length} 个问题：`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('全部通过，且无控制台报错');
